import { pgTable, serial, integer, text, timestamp, primaryKey } from "drizzle-orm/pg-core";

// One chat per client: the client and everyone on our team (admin logins) write in the same thread.
export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  senderUserId: integer("sender_user_id").notNull(),
  senderName: text("sender_name").notNull(),
  senderRole: text("sender_role").notNull(), // client | admin
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// How far each person has read in each client's chat, for unread counts and notifications.
export const messageReadsTable = pgTable("message_reads", {
  userId: integer("user_id").notNull(),
  clientId: integer("client_id").notNull(),
  lastReadId: integer("last_read_id").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.userId, t.clientId] })]);

export type Message = typeof messagesTable.$inferSelect;
