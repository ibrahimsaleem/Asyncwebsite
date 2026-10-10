import { Router, type IRouter, type Request, type Response } from "express";
import {
  db, projectsTable, clientsTable,
  projectUpdatesTable, projectMilestonesTable, projectQuestionsTable,
} from "@workspace/db";
import { and, asc, desc, eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router: IRouter = Router();

export const DEFAULT_MILESTONES = [
  "Demo done",
  "Questions answered",
  "Requirements and proposal sent",
  "Contract signed",
  "Advance payment received",
  "Kickoff call",
  "Voice agent built",
  "Testing with your team",
  "Live on real calls",
  "First monthly report",
];

// Admins see every project; a client only their own. Sends the error and returns null when access is denied.
async function loadProjectFor(req: Request, res: Response) {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return null;
  }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return null;
  }
  if (req.session.userRole !== "admin") {
    const [me] = await db.select().from(clientsTable).where(eq(clientsTable.userId, req.session.userId!));
    if (!me || me.id !== project.clientId) {
      res.status(403).json({ error: "Access denied" });
      return null;
    }
  }
  return project;
}

router.get("/projects/:id/tracking", requireAuth, async (req, res): Promise<void> => {
  const project = await loadProjectFor(req, res);
  if (!project) return;

  let milestones = await db.select().from(projectMilestonesTable)
    .where(eq(projectMilestonesTable.projectId, project.id)).orderBy(asc(projectMilestonesTable.position));
  if (milestones.length === 0) {
    milestones = await db.insert(projectMilestonesTable)
      .values(DEFAULT_MILESTONES.map((title, position) => ({ projectId: project.id, title, position })))
      .returning();
  }
  const updates = await db.select().from(projectUpdatesTable)
    .where(eq(projectUpdatesTable.projectId, project.id)).orderBy(desc(projectUpdatesTable.createdAt));
  const questions = await db.select().from(projectQuestionsTable)
    .where(eq(projectQuestionsTable.projectId, project.id))
    .orderBy(asc(projectQuestionsTable.position), asc(projectQuestionsTable.id));

  res.json({ updates, milestones, questions });
});

router.patch("/projects/:id/milestones/:milestoneId", requireAdmin, async (req, res): Promise<void> => {
  const projectId = parseInt(String(req.params.id), 10);
  const milestoneId = parseInt(String(req.params.milestoneId), 10);
  const set: { doneAt?: Date | null; title?: string } = {};
  if (typeof req.body?.done === "boolean") set.doneAt = req.body.done ? new Date() : null;
  if (typeof req.body?.title === "string" && req.body.title.trim()) set.title = req.body.title.trim().slice(0, 200);
  if (Object.keys(set).length === 0) {
    res.status(400).json({ error: "Send done (true/false) or a new title" });
    return;
  }
  const [m] = await db.update(projectMilestonesTable)
    .set(set)
    .where(and(eq(projectMilestonesTable.id, milestoneId), eq(projectMilestonesTable.projectId, projectId)))
    .returning();
  if (!m) {
    res.status(404).json({ error: "Milestone not found" });
    return;
  }
  res.json(m);
});

router.post("/projects/:id/milestones", requireAdmin, async (req, res): Promise<void> => {
  const project = await loadProjectFor(req, res);
  if (!project) return;
  const title = String(req.body?.title ?? "").trim().slice(0, 200);
  if (!title) {
    res.status(400).json({ error: "Give the step a name" });
    return;
  }
  const existing = await db.select().from(projectMilestonesTable).where(eq(projectMilestonesTable.projectId, project.id));
  const position = existing.reduce((max, m) => Math.max(max, m.position), -1) + 1;
  const [m] = await db.insert(projectMilestonesTable).values({ projectId: project.id, title, position }).returning();
  res.status(201).json(m);
});

router.delete("/projects/:id/milestones/:milestoneId", requireAdmin, async (req, res): Promise<void> => {
  await db.delete(projectMilestonesTable).where(and(
    eq(projectMilestonesTable.id, parseInt(String(req.params.milestoneId), 10)),
    eq(projectMilestonesTable.projectId, parseInt(String(req.params.id), 10)),
  ));
  res.json({ success: true });
});

// Admin adds questions: one per line in `questions`, all under `section`.
// Optional answer choices after the question, split by "|": "Preferred voice? | Female | Male"
router.post("/projects/:id/questions", requireAdmin, async (req, res): Promise<void> => {
  const project = await loadProjectFor(req, res);
  if (!project) return;
  const section = String(req.body?.section ?? "").trim() || "General";
  const lines = String(req.body?.questions ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    res.status(400).json({ error: "Add at least one question" });
    return;
  }
  const existing = await db.select().from(projectQuestionsTable).where(eq(projectQuestionsTable.projectId, project.id));
  const start = existing.reduce((max, q) => Math.max(max, q.position), -1) + 1;
  const created = await db.insert(projectQuestionsTable)
    .values(lines.map((line, i) => {
      const [question, ...options] = line.split("|").map((p) => p.trim()).filter(Boolean);
      return { projectId: project.id, section, question, options: options.length ? options : null, position: start + i };
    }))
    .returning();
  res.status(201).json(created);
});

router.delete("/projects/:id/questions/:questionId", requireAdmin, async (req, res): Promise<void> => {
  await db.delete(projectQuestionsTable).where(and(
    eq(projectQuestionsTable.id, parseInt(String(req.params.questionId), 10)),
    eq(projectQuestionsTable.projectId, parseInt(String(req.params.id), 10)),
  ));
  res.json({ success: true });
});

// Client (or admin) saves answers: { answers: { [questionId]: "text" } }. Partial saves are fine.
router.put("/projects/:id/answers", requireAuth, async (req, res): Promise<void> => {
  const project = await loadProjectFor(req, res);
  if (!project) return;
  const answers = req.body?.answers;
  if (!answers || typeof answers !== "object") {
    res.status(400).json({ error: "answers is required" });
    return;
  }
  for (const [qid, value] of Object.entries(answers)) {
    const text = String(value ?? "").trim().slice(0, 5000);
    await db.update(projectQuestionsTable)
      .set({ answer: text || null, answeredAt: text ? new Date() : null })
      .where(and(eq(projectQuestionsTable.id, parseInt(qid, 10)), eq(projectQuestionsTable.projectId, project.id)));
  }
  res.json({ success: true });
});

export default router;
