import { Router, type IRouter } from "express";
import { db, projectsTable, projectAssignmentsTable, employeesTable, clientsTable } from "@workspace/db";
import { eq, inArray, and } from "drizzle-orm";
import {
  CreateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  UpdateProjectBody,
  AssignEmployeeParams,
  AssignEmployeeBody,
  UnassignEmployeeParams,
  UnassignEmployeeBody,
  ListProjectsResponse,
  CreateProjectResponse,
  GetProjectResponse,
  UpdateProjectResponse,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../lib/auth";

const router: IRouter = Router();

async function buildProjectWithDetails(project: typeof projectsTable.$inferSelect) {
  const assignments = await db
    .select()
    .from(projectAssignmentsTable)
    .where(eq(projectAssignmentsTable.projectId, project.id));

  let employees: typeof employeesTable.$inferSelect[] = [];
  if (assignments.length > 0) {
    employees = await db
      .select()
      .from(employeesTable)
      .where(inArray(employeesTable.id, assignments.map((a) => a.employeeId)));
  }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, project.clientId));

  return {
    id: project.id,
    clientId: project.clientId,
    projectName: project.projectName,
    description: project.description,
    status: project.status,
    startDate: project.startDate ?? null,
    expectedCompletionDate: project.expectedCompletionDate ?? null,
    latestUpdate: project.latestUpdate ?? null,
    clientBusinessName: client?.businessName ?? "",
    employees: employees.map((e) => ({ id: e.id, name: e.name, role: e.role, email: e.email })),
  };
}

router.get("/projects", requireAuth, async (req, res): Promise<void> => {
  let projects: typeof projectsTable.$inferSelect[];

  if (req.session.userRole === "admin") {
    projects = await db.select().from(projectsTable);
  } else {
    // Find the client record for this user
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.userId, req.session.userId!));
    if (!client) {
      res.json([]);
      return;
    }
    projects = await db.select().from(projectsTable).where(eq(projectsTable.clientId, client.id));
  }

  const detailed = await Promise.all(projects.map(buildProjectWithDetails));
  res.json(ListProjectsResponse.parse(detailed));
});

router.post("/projects", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db.insert(projectsTable).values(parsed.data).returning();
  const detailed = await buildProjectWithDetails(project);
  res.status(201).json(CreateProjectResponse.parse(detailed));
});

router.get("/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const detailed = await buildProjectWithDetails(project);
  res.json(GetProjectResponse.parse(detailed));
});

router.patch("/projects/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .update(projectsTable)
    .set(parsed.data)
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const detailed = await buildProjectWithDetails(project);
  res.json(UpdateProjectResponse.parse(detailed));
});

router.post("/projects/:id/assign", requireAdmin, async (req, res): Promise<void> => {
  const params = AssignEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AssignEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Avoid duplicates
  const existing = await db
    .select()
    .from(projectAssignmentsTable)
    .where(
      eq(projectAssignmentsTable.projectId, params.data.id)
    );
  const alreadyAssigned = existing.some((a) => a.employeeId === parsed.data.employeeId);

  if (!alreadyAssigned) {
    await db.insert(projectAssignmentsTable).values({
      projectId: params.data.id,
      employeeId: parsed.data.employeeId,
    });
  }

  res.status(201).json({ success: true });
});

router.post("/projects/:id/unassign", requireAdmin, async (req, res): Promise<void> => {
  const params = UnassignEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UnassignEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .delete(projectAssignmentsTable)
    .where(
      and(
        eq(projectAssignmentsTable.projectId, params.data.id),
        eq(projectAssignmentsTable.employeeId, parsed.data.employeeId)
      )
    );

  res.json({ success: true });
});

export default router;
