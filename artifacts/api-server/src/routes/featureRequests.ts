import { Router, type IRouter } from "express";
import { db, featureRequestsTable, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateFeatureRequestBody,
  UpdateFeatureRequestParams,
  UpdateFeatureRequestBody,
  ListFeatureRequestsResponse,
  CreateFeatureRequestResponse,
  UpdateFeatureRequestResponse,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../lib/auth";

const router: IRouter = Router();

async function formatRequest(fr: typeof featureRequestsTable.$inferSelect) {
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, fr.clientId));
  return {
    id: fr.id,
    clientId: fr.clientId,
    projectId: fr.projectId ?? null,
    title: fr.title,
    description: fr.description,
    priority: fr.priority,
    status: fr.status,
    createdAt: fr.createdAt.toISOString(),
    clientBusinessName: client?.businessName ?? null,
  };
}

router.get("/feature-requests", requireAuth, async (req, res): Promise<void> => {
  let requests: typeof featureRequestsTable.$inferSelect[];

  if (req.session.userRole === "admin") {
    requests = await db.select().from(featureRequestsTable);
  } else {
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.userId, req.session.userId!));
    if (!client) {
      res.json([]);
      return;
    }
    requests = await db.select().from(featureRequestsTable).where(eq(featureRequestsTable.clientId, client.id));
  }

  const formatted = await Promise.all(requests.map(formatRequest));
  res.json(ListFeatureRequestsResponse.parse(formatted));
});

router.post("/feature-requests", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateFeatureRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let clientId: number;
  if (req.session.userRole === "admin") {
    // Admin must supply clientId separately (not in spec body, use session workaround)
    const fromBody = (req.body as { clientId?: number }).clientId;
    if (!fromBody) {
      res.status(400).json({ error: "clientId required for admin" });
      return;
    }
    clientId = fromBody;
  } else {
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.userId, req.session.userId!));
    if (!client) {
      res.status(403).json({ error: "No client profile found" });
      return;
    }
    clientId = client.id;
  }

  const [fr] = await db
    .insert(featureRequestsTable)
    .values({ ...parsed.data, clientId })
    .returning();

  res.status(201).json(CreateFeatureRequestResponse.parse(await formatRequest(fr)));
});

router.patch("/feature-requests/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateFeatureRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateFeatureRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [fr] = await db
    .update(featureRequestsTable)
    .set(parsed.data)
    .where(eq(featureRequestsTable.id, params.data.id))
    .returning();

  if (!fr) {
    res.status(404).json({ error: "Feature request not found" });
    return;
  }

  res.json(UpdateFeatureRequestResponse.parse(await formatRequest(fr)));
});

export default router;
