import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

// Every update posted to a project, so the client sees the full history, not just the latest message.
export const projectUpdatesTable = pgTable("project_updates", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Checklist of deal + build steps (questions answered, contract signed, live, ...).
export const projectMilestonesTable = pgTable("project_milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  title: text("title").notNull(),
  position: integer("position").notNull().default(0),
  doneAt: timestamp("done_at", { withTimezone: true }),
});

// Onboarding questions the client answers in their portal.
export const projectQuestionsTable = pgTable("project_questions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  section: text("section").notNull().default("General"),
  question: text("question").notNull(),
  // Suggested answers shown as clickable chips; the client can still type anything.
  options: text("options").array(),
  answer: text("answer"),
  position: integer("position").notNull().default(0),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
});

export type ProjectUpdate = typeof projectUpdatesTable.$inferSelect;
export type ProjectMilestone = typeof projectMilestonesTable.$inferSelect;
export type ProjectQuestion = typeof projectQuestionsTable.$inferSelect;
