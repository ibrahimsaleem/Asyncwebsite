import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    userId: number;
    userRole: string;
  }
}

// Refreshes the role from the database so routes that check req.session.userRole see removals right away.
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!user) {
    req.session.destroy(() => res.status(401).json({ error: "Not authenticated" }));
    return;
  }
  req.session.userRole = user.role;
  next();
}

// Checks the database, not just the session, so removing someone's admin login takes effect immediately.
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (user?.role !== "admin") {
    if (user) req.session.userRole = user.role;
    res.status(user ? 403 : 401).json({ error: user ? "Admin access required" : "Not authenticated" });
    return;
  }
  next();
}
