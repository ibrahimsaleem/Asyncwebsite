import { Router, type IRouter } from "express";
import { db, invoicesTable, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateInvoiceBody,
  GetInvoiceParams,
  UpdateInvoiceParams,
  UpdateInvoiceBody,
  ListInvoicesResponse,
  CreateInvoiceResponse,
  GetInvoiceResponse,
  UpdateInvoiceResponse,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../lib/auth";

const router: IRouter = Router();

async function formatInvoice(inv: typeof invoicesTable.$inferSelect) {
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, inv.clientId));
  return {
    id: inv.id,
    clientId: inv.clientId,
    projectId: inv.projectId ?? null,
    invoiceNumber: inv.invoiceNumber,
    totalAmount: parseFloat(inv.totalAmount),
    paidAmount: parseFloat(inv.paidAmount),
    dueAmount: parseFloat(inv.dueAmount),
    status: inv.status,
    dueDate: inv.dueDate,
    notes: inv.notes ?? null,
    createdAt: inv.createdAt.toISOString(),
    clientBusinessName: client?.businessName ?? null,
  };
}

router.get("/invoices", requireAuth, async (req, res): Promise<void> => {
  let invoices: typeof invoicesTable.$inferSelect[];

  if (req.session.userRole === "admin") {
    invoices = await db.select().from(invoicesTable);
  } else {
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.userId, req.session.userId!));
    if (!client) {
      res.json([]);
      return;
    }
    invoices = await db.select().from(invoicesTable).where(eq(invoicesTable.clientId, client.id));
  }

  const formatted = await Promise.all(invoices.map(formatInvoice));
  res.json(ListInvoicesResponse.parse(formatted));
});

router.post("/invoices", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [inv] = await db.insert(invoicesTable).values({
    ...parsed.data,
    totalAmount: String(parsed.data.totalAmount),
    paidAmount: String(parsed.data.paidAmount),
    dueAmount: String(parsed.data.dueAmount),
  }).returning();

  res.status(201).json(CreateInvoiceResponse.parse(await formatInvoice(inv)));
});

router.get("/invoices/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id));
  if (!inv) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  res.json(GetInvoiceResponse.parse(await formatInvoice(inv)));
});

router.patch("/invoices/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.totalAmount !== undefined) updateData.totalAmount = String(parsed.data.totalAmount);
  if (parsed.data.paidAmount !== undefined) updateData.paidAmount = String(parsed.data.paidAmount);
  if (parsed.data.dueAmount !== undefined) updateData.dueAmount = String(parsed.data.dueAmount);

  const [inv] = await db
    .update(invoicesTable)
    .set(updateData)
    .where(eq(invoicesTable.id, params.data.id))
    .returning();

  if (!inv) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  res.json(UpdateInvoiceResponse.parse(await formatInvoice(inv)));
});

export default router;
