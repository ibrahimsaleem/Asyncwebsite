import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { db, projectsTable, projectAssignmentsTable, projectUpdatesTable, projectMilestonesTable, projectQuestionsTable, invoicesTable, uploadedFilesTable, featureRequestsTable, demoRequestsTable, messagesTable, messageReadsTable, usersTable, clientsTable } from "@workspace/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  CreateClientBody,
  GetClientParams,
  UpdateClientParams,
  UpdateClientBody,
  ListClientsResponse,
  GetMyClientResponse,
  GetClientResponse,
  CreateClientResponse,
  UpdateClientResponse,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../lib/auth";

const router: IRouter = Router();

function formatClient(client: typeof clientsTable.$inferSelect, user?: typeof usersTable.$inferSelect) {
  return {
    id: client.id,
    userId: client.userId,
    businessName: client.businessName,
    industry: client.industry,
    phone: client.phone,
    email: client.email,
    notes: client.notes ?? null,
    userName: user?.name ?? "",
    userEmail: user?.email ?? client.email,
    isDemo: client.isDemo,
  };
}

router.get("/clients", requireAdmin, async (_req, res): Promise<void> => {
  const clients = await db.select().from(clientsTable);
  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map((u) => [u.id, u]));

  res.json(
    ListClientsResponse.parse(clients.map((c) => formatClient(c, userMap.get(c.userId))))
  );
});

router.post("/clients", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password, businessName, industry, phone, notes } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "A user with this email already exists" });
    return;
  }

  // Create user account
  const passwordHash = await bcrypt.hash(password ?? "changeme123", 10);
  const [user] = await db
    .insert(usersTable)
    .values({ name, email, passwordHash, role: "client" })
    .returning();

  // Create client record
  const [client] = await db
    .insert(clientsTable)
    .values({ userId: user.id, businessName, industry, phone, email, notes: notes ?? null })
    .returning();

  res.status(201).json(CreateClientResponse.parse(formatClient(client, user)));
});

router.get("/clients/me", requireAuth, async (req, res): Promise<void> => {
  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.userId, req.session.userId!));

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, client.userId));
  res.json(GetMyClientResponse.parse(formatClient(client, user)));
});

router.get("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, params.data.id));

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  // Non-admins may only view their own records
  if (req.session.userRole !== "admin") {
    const [me] = await db.select().from(clientsTable).where(eq(clientsTable.userId, req.session.userId!));
    if (!me || me.id !== client.id) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, client.userId));
  res.json(GetClientResponse.parse(formatClient(client, user)));
});

router.patch("/clients/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email: rawEmail, contactName, ...clientFields } = parsed.data;
  const [current] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id));
  if (!current) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  // The email is also their portal login, so it must stay unique across all logins
  const email = rawEmail?.trim().toLowerCase();
  if (email && email !== current.email.toLowerCase()) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      res.status(400).json({ error: "That email doesn't look right" });
      return;
    }
    const [taken] = await db.select().from(usersTable).where(sql`lower(${usersTable.email}) = ${email}`);
    if (taken && taken.id !== current.userId) {
      res.status(409).json({ error: "Another account already uses that email" });
      return;
    }
  }

  const client = await db.transaction(async (tx) => {
    const [c] = await tx.update(clientsTable).set({ ...clientFields, ...(email ? { email } : {}) })
      .where(eq(clientsTable.id, params.data.id)).returning();
    const userSet = { ...(email ? { email } : {}), ...(contactName?.trim() ? { name: contactName.trim() } : {}) };
    if (Object.keys(userSet).length) await tx.update(usersTable).set(userSet).where(eq(usersTable.id, c.userId));
    return c;
  });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, client.userId));
  res.json(UpdateClientResponse.parse(formatClient(client, user)));
});

// Admin sets a new password for a client's portal login (clients can't reset it by email yet)
router.post("/clients/:id/reset-password", requireAdmin, async (req, res): Promise<void> => {
  const password = String(req.body?.password ?? "");
  if (password.length < 10) {
    res.status(400).json({ error: "Password must be at least 10 characters" });
    return;
  }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, Number(req.params.id)));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  await db.update(usersTable).set({ passwordHash: await bcrypt.hash(password, 10) }).where(eq(usersTable.id, client.userId));
  res.json({ success: true });
});

// Removes a client and everything that belongs to them (projects and their tracking, invoices,
// files, requests) plus their portal login. Used for real deletions and for clearing demo data.
async function deleteClientCascade(clientId: number) {
  await db.transaction(async (tx) => {
    const [client] = await tx.select().from(clientsTable).where(eq(clientsTable.id, clientId));
    if (!client) return;
    const projectIds = (await tx.select({ id: projectsTable.id }).from(projectsTable).where(eq(projectsTable.clientId, clientId))).map((p) => p.id);
    if (projectIds.length) {
      await tx.delete(projectQuestionsTable).where(inArray(projectQuestionsTable.projectId, projectIds));
      await tx.delete(projectMilestonesTable).where(inArray(projectMilestonesTable.projectId, projectIds));
      await tx.delete(projectUpdatesTable).where(inArray(projectUpdatesTable.projectId, projectIds));
      await tx.delete(projectAssignmentsTable).where(inArray(projectAssignmentsTable.projectId, projectIds));
      await tx.delete(projectsTable).where(inArray(projectsTable.id, projectIds));
    }
    await tx.delete(invoicesTable).where(eq(invoicesTable.clientId, clientId));
    await tx.delete(uploadedFilesTable).where(eq(uploadedFilesTable.clientId, clientId));
    await tx.delete(featureRequestsTable).where(eq(featureRequestsTable.clientId, clientId));
    await tx.delete(messagesTable).where(eq(messagesTable.clientId, clientId));
    await tx.delete(messageReadsTable).where(eq(messageReadsTable.clientId, clientId));
    await tx.delete(clientsTable).where(eq(clientsTable.id, clientId));
    await tx.delete(usersTable).where(and(eq(usersTable.id, client.userId), eq(usersTable.role, "client")));
  });
}

router.delete("/clients/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, id));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  await deleteClientCascade(id);
  res.json({ success: true });
});

// One click to clear the sample data the site created on its first run
router.delete("/demo-data", requireAdmin, async (_req, res): Promise<void> => {
  const demo = await db.select({ id: clientsTable.id }).from(clientsTable).where(eq(clientsTable.isDemo, true));
  for (const c of demo) await deleteClientCascade(c.id);
  const leads = await db.delete(demoRequestsTable).where(eq(demoRequestsTable.isDemo, true)).returning({ id: demoRequestsTable.id });
  res.json({ clientsRemoved: demo.length, leadsRemoved: leads.length });
});

export default router;
