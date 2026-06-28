import { Router, type IRouter } from "express";
import { db, clientsTable, projectsTable, invoicesTable, featureRequestsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetAdminSummaryResponse } from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

router.get("/dashboard/admin-summary", requireAdmin, async (_req, res): Promise<void> => {
  const clients = await db.select().from(clientsTable);
  const projects = await db.select().from(projectsTable);
  const invoices = await db.select().from(invoicesTable);
  const featureRequests = await db.select().from(featureRequestsTable);

  const totalClients = clients.length;
  const activeProjects = projects.filter((p) => p.status !== "completed").length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;

  const totalPaid = invoices.reduce((sum, inv) => sum + parseFloat(inv.paidAmount), 0);
  const totalDue = invoices.reduce((sum, inv) => sum + parseFloat(inv.dueAmount), 0);
  const pendingFeatureRequests = featureRequests.filter((fr) =>
    fr.status === "new" || fr.status === "in_review"
  ).length;

  res.json(
    GetAdminSummaryResponse.parse({
      totalClients,
      activeProjects,
      completedProjects,
      totalPaid,
      totalDue,
      pendingFeatureRequests,
    })
  );
});

export default router;
