import { customType, pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export const uploadedFilesTable = pgTable("uploaded_files", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  projectId: integer("project_id"),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  // The file itself lives in the database: the server's disk is wiped on every deploy,
  // and serving it through an authenticated route keeps it private to that client.
  data: bytea("data"),
  mimeType: text("mime_type"),
  size: integer("size"),
  uploadedBy: text("uploaded_by").notNull().default("client"), // client | admin
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUploadedFileSchema = createInsertSchema(uploadedFilesTable).omit({ id: true, uploadedAt: true });
export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
export type UploadedFile = typeof uploadedFilesTable.$inferSelect;
