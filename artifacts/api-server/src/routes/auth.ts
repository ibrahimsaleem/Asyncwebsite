import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { db, usersTable, clientsTable, projectsTable, featureRequestsTable, projectUpdatesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { LoginBody, RegisterBody, GetMeResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// Brute-force guard: 8 wrong passwords per email + IP in 15 minutes, then wait.
// ponytail: in-memory, resets on restart and isn't shared across instances; move to Postgres/Redis if we scale out.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;
const fails = new Map<string, { count: number; first: number }>();
function tooManyAttempts(key: string) {
  const f = fails.get(key);
  if (f && Date.now() - f.first > WINDOW_MS) fails.delete(key);
  return (fails.get(key)?.count ?? 0) >= MAX_FAILS;
}
function recordFail(key: string) {
  const f = fails.get(key);
  if (!f || Date.now() - f.first > WINDOW_MS) fails.set(key, { count: 1, first: Date.now() });
  else f.count++;
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { password } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();
  const key = `${email}|${req.ip}`;
  if (tooManyAttempts(key)) {
    res.status(429).json({ error: "Too many wrong attempts. Please wait 15 minutes and try again." });
    return;
  }
  const [user] = await db.select().from(usersTable).where(sql`lower(${usersTable.email}) = ${email}`);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    recordFail(key);
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  fails.delete(key);

  req.session.userId = user.id;
  req.session.userRole = user.role;

  res.json({
    user: GetMeResponse.parse({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    }),
  });
});

// Self-service signup: a business creates its own client account and tells us
// what it needs. The team then picks it up from the admin dashboard.
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, password, businessName, industry, phone, requirements } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();

  const [existing] = await db.select().from(usersTable).where(sql`lower(${usersTable.email}) = ${email}`);
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists. Please log in instead." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const today = new Date().toISOString().slice(0, 10);

  const user = await db.transaction(async (tx) => {
    const [user] = await tx.insert(usersTable).values({ name, email, passwordHash, role: "client" }).returning();
    const [client] = await tx
      .insert(clientsTable)
      .values({ userId: user.id, businessName, industry, phone, email, notes: "Signed up online" })
      .returning();
    const [project] = await tx
      .insert(projectsTable)
      .values({
        clientId: client.id,
        projectName: `${businessName} voice agent`,
        description: requirements,
        status: "onboarding",
        startDate: today,
        latestUpdate: "Request received! Our team will review your needs and contact you within 1 business day to schedule your free consultation.",
      })
      .returning();
    await tx.insert(projectUpdatesTable).values({ projectId: project.id, message: project.latestUpdate! });
    await tx.insert(featureRequestsTable).values({
      clientId: client.id,
      projectId: project.id,
      title: "New signup: initial voice agent request",
      description: requirements,
      priority: "high",
      status: "new",
    });
    return user;
  });

  req.session.userId = user.id;
  req.session.userRole = user.role;

  res.status(201).json({
    user: GetMeResponse.parse({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    }),
  });
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const current = String(req.body?.currentPassword ?? "");
  const next = String(req.body?.newPassword ?? "");
  if (next.length < 10) {
    res.status(400).json({ error: "New password must be at least 10 characters" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    res.status(400).json({ error: "Your current password isn't right" });
    return;
  }
  await db.update(usersTable).set({ passwordHash: await bcrypt.hash(next, 10) }).where(eq(usersTable.id, user.id));
  res.json({ success: true });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(
    GetMeResponse.parse({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    })
  );
});

export default router;
