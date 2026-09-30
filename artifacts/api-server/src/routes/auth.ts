import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { db, usersTable, clientsTable, projectsTable, featureRequestsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { LoginBody, RegisterBody, GetMeResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { password } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();
  const [user] = await db.select().from(usersTable).where(sql`lower(${usersTable.email}) = ${email}`);

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

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
