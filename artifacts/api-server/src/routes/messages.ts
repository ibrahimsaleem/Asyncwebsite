import { Router, type IRouter, type Request, type Response } from "express";
import { db, messagesTable, messageReadsTable, clientsTable, usersTable, employeesTable } from "@workspace/db";
import { and, asc, desc, eq, gt, ne, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router: IRouter = Router();

// Which client's chat this request is about: a client always gets their own; an admin names one.
async function threadFor(req: Request, res: Response, clientIdParam: unknown): Promise<number | null> {
  if (req.session.userRole === "admin") {
    const id = Number(clientIdParam);
    const [client] = Number.isInteger(id) ? await db.select().from(clientsTable).where(eq(clientsTable.id, id)) : [];
    if (!client) {
      res.status(400).json({ error: "Choose a client" });
      return null;
    }
    return id;
  }
  const [mine] = await db.select().from(clientsTable).where(eq(clientsTable.userId, req.session.userId!));
  if (!mine) {
    res.status(403).json({ error: "No client profile found" });
    return null;
  }
  return mine.id;
}

async function lastRead(userId: number, clientId: number) {
  const [r] = await db.select().from(messageReadsTable)
    .where(and(eq(messageReadsTable.userId, userId), eq(messageReadsTable.clientId, clientId)));
  return r?.lastReadId ?? 0;
}

// Team members' job titles, so the client sees "Mizba Siddiqui · Project Manager"
async function teamTitles() {
  const team = await db.select({ email: employeesTable.email, role: employeesTable.role }).from(employeesTable);
  const users = await db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable).where(eq(usersTable.role, "admin"));
  const byEmail = new Map(team.map((t) => [t.email.toLowerCase(), t.role]));
  return new Map(users.map((u) => [u.id, byEmail.get(u.email.toLowerCase()) ?? "aicronics team"]));
}

router.get("/messages", requireAuth, async (req, res): Promise<void> => {
  const clientId = await threadFor(req, res, req.query.clientId);
  if (!clientId) return;
  const rows = await db.select().from(messagesTable).where(eq(messagesTable.clientId, clientId))
    .orderBy(asc(messagesTable.id)).limit(1000);
  const titles = await teamTitles();
  res.json(rows.map((m) => ({
    id: m.id,
    body: m.body,
    senderName: m.senderName,
    senderRole: m.senderRole,
    senderTitle: m.senderRole === "admin" ? titles.get(m.senderUserId) ?? "aicronics team" : null,
    mine: m.senderUserId === req.session.userId,
    createdAt: m.createdAt.toISOString(),
  })));
});

router.post("/messages", requireAuth, async (req, res): Promise<void> => {
  const clientId = await threadFor(req, res, req.body?.clientId);
  if (!clientId) return;
  const body = String(req.body?.body ?? "").trim();
  if (!body || body.length > 4000) {
    res.status(400).json({ error: body ? "Messages can be up to 4,000 characters" : "Write a message first" });
    return;
  }
  const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
  const [msg] = await db.insert(messagesTable).values({
    clientId, body, senderUserId: me.id, senderName: me.name, senderRole: me.role === "admin" ? "admin" : "client",
  }).returning();
  // Your own message counts as read
  await db.insert(messageReadsTable).values({ userId: me.id, clientId, lastReadId: msg.id })
    .onConflictDoUpdate({ target: [messageReadsTable.userId, messageReadsTable.clientId], set: { lastReadId: msg.id } });
  res.status(201).json({ id: msg.id });
});

router.post("/messages/read", requireAuth, async (req, res): Promise<void> => {
  const clientId = await threadFor(req, res, req.body?.clientId);
  if (!clientId) return;
  const [latest] = await db.select({ id: messagesTable.id }).from(messagesTable)
    .where(eq(messagesTable.clientId, clientId)).orderBy(desc(messagesTable.id)).limit(1);
  const lastReadId = latest?.id ?? 0;
  await db.insert(messageReadsTable).values({ userId: req.session.userId!, clientId, lastReadId })
    .onConflictDoUpdate({ target: [messageReadsTable.userId, messageReadsTable.clientId], set: { lastReadId } });
  res.json({ success: true });
});

router.delete("/messages/:id", requireAdmin, async (req, res): Promise<void> => {
  await db.delete(messagesTable).where(eq(messagesTable.id, Number(req.params.id)));
  res.json({ success: true });
});

// For the badge and pop-up: how many unread, and the newest unread message.
router.get("/messages/unread", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const isAdmin = req.session.userRole === "admin";
  let clientIds: number[];
  if (isAdmin) {
    clientIds = (await db.selectDistinct({ id: messagesTable.clientId }).from(messagesTable)).map((r) => r.id);
  } else {
    const [mine] = await db.select().from(clientsTable).where(eq(clientsTable.userId, userId));
    clientIds = mine ? [mine.id] : [];
  }
  let total = 0;
  let latest: { id: number; clientId: number; senderName: string; body: string } | null = null;
  for (const clientId of clientIds) {
    const after = await lastRead(userId, clientId);
    const unread = await db.select().from(messagesTable)
      .where(and(eq(messagesTable.clientId, clientId), gt(messagesTable.id, after), ne(messagesTable.senderUserId, userId)))
      .orderBy(desc(messagesTable.id));
    total += unread.length;
    if (unread[0] && (!latest || unread[0].id > latest.id)) {
      latest = { id: unread[0].id, clientId, senderName: unread[0].senderName, body: unread[0].body.slice(0, 140) };
    }
  }
  res.json({ total, latest });
});

// Admin inbox: every client, with their latest message and your unread count, newest first.
router.get("/messages/threads", requireAdmin, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const clients = await db.select().from(clientsTable);
  const threads = await Promise.all(clients.map(async (c) => {
    const [last] = await db.select().from(messagesTable).where(eq(messagesTable.clientId, c.id)).orderBy(desc(messagesTable.id)).limit(1);
    const after = await lastRead(userId, c.id);
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(messagesTable)
      .where(and(eq(messagesTable.clientId, c.id), gt(messagesTable.id, after), ne(messagesTable.senderUserId, userId)));
    return {
      clientId: c.id,
      businessName: c.businessName,
      isDemo: c.isDemo,
      unread: n,
      lastMessage: last ? { body: last.body.slice(0, 120), senderName: last.senderName, createdAt: last.createdAt.toISOString() } : null,
    };
  }));
  threads.sort((a, b) => (b.lastMessage?.createdAt ?? "").localeCompare(a.lastMessage?.createdAt ?? "") || Number(a.isDemo) - Number(b.isDemo));
  res.json(threads);
});

export default router;
