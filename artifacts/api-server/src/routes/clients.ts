import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { db, usersTable, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

  const [client] = await db
    .update(clientsTable)
    .set(parsed.data)
    .where(eq(clientsTable.id, params.data.id))
    .returning();

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, client.userId));
  res.json(UpdateClientResponse.parse(formatClient(client, user)));
});

export default router;
