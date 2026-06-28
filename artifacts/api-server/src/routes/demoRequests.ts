import { Router, type IRouter } from "express";
import { db, demoRequestsTable } from "@workspace/db";
import { CreateDemoRequestBody, CreateDemoRequestResponse, ListDemoRequestsResponse } from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.post("/demo-requests", async (req, res): Promise<void> => {
  const parsed = CreateDemoRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [demo] = await db.insert(demoRequestsTable).values(parsed.data).returning();
  res.status(201).json(
    CreateDemoRequestResponse.parse({
      ...demo,
      createdAt: demo.createdAt.toISOString(),
      message: demo.message ?? null,
    })
  );
});

router.get("/demo-requests", requireAdmin, async (_req, res): Promise<void> => {
  const demos = await db.select().from(demoRequestsTable).orderBy(desc(demoRequestsTable.createdAt));
  res.json(
    ListDemoRequestsResponse.parse(
      demos.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
        message: d.message ?? null,
      }))
    )
  );
});

export default router;
