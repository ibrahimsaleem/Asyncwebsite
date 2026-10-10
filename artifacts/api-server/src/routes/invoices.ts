import { Router, type IRouter } from "express";
import { db, invoicesTable, clientsTable, projectsTable } from "@workspace/db";
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

// Due amount and status always follow from the numbers, so they can't be entered inconsistently.
function settle(total: number, paid: number, dueDate: string) {
  const due = Math.max(0, Math.round((total - paid) * 100) / 100);
  const today = new Date().toISOString().slice(0, 10);
  const status = due === 0 ? "paid" : dueDate < today ? "overdue" : paid > 0 ? "partial" : "due";
  return { dueAmount: String(due), status };
}

function checkAmounts(total: number, paid: number): string | null {
  if (!(total > 0)) return "Total must be more than 0";
  if (paid < 0) return "Paid amount can't be negative";
  if (paid > total) return "Paid amount can't be more than the total";
  return null;
}

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
    // Recomputed on read so an unpaid invoice turns overdue when its date passes
    status: settle(parseFloat(inv.totalAmount), parseFloat(inv.paidAmount), inv.dueDate).status as "paid" | "partial" | "due" | "overdue",
    dueDate: inv.dueDate,
    notes: inv.notes ?? null,
    currency: inv.currency as "INR" | "USD",
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

  const { totalAmount, paidAmount, dueDate, projectId, clientId } = parsed.data;
  const problem = checkAmounts(totalAmount, paidAmount);
  if (problem) {
    res.status(400).json({ error: problem });
    return;
  }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));
  if (!client) {
    res.status(400).json({ error: "Client not found" });
    return;
  }
  if (projectId != null) {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    if (!project || project.clientId !== clientId) {
      res.status(400).json({ error: "That project doesn't belong to this client" });
      return;
    }
  }

  const [inv] = await db.insert(invoicesTable).values({
    ...parsed.data,
    currency: parsed.data.currency ?? "INR",
    totalAmount: String(totalAmount),
    paidAmount: String(paidAmount),
    ...settle(totalAmount, paidAmount, dueDate),
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

  // Non-admins may only view their own records
  if (req.session.userRole !== "admin") {
    const [me] = await db.select().from(clientsTable).where(eq(clientsTable.userId, req.session.userId!));
    if (!me || me.id !== inv.clientId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
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

  const [current] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id));
  if (!current) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  const total = parsed.data.totalAmount ?? parseFloat(current.totalAmount);
  const paid = parsed.data.paidAmount ?? parseFloat(current.paidAmount);
  const problem = checkAmounts(total, paid);
  if (problem) {
    res.status(400).json({ error: problem });
    return;
  }
  const { dueAmount: _ignoredDue, status: _ignoredStatus, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = {
    ...rest,
    totalAmount: String(total),
    paidAmount: String(paid),
    ...settle(total, paid, parsed.data.dueDate ?? current.dueDate),
  };

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
