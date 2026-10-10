import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { db, employeesTable, usersTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import {
  CreateEmployeeBody,
  UpdateEmployeeParams,
  UpdateEmployeeBody,
  DeleteEmployeeParams,
  ListEmployeesResponse,
  CreateEmployeeResponse,
  UpdateEmployeeResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

router.get("/employees", requireAdmin, async (_req, res): Promise<void> => {
  const employees = await db.select().from(employeesTable);
  res.json(ListEmployeesResponse.parse(employees));
});

router.post("/employees", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [employee] = await db.insert(employeesTable).values(parsed.data).returning();
  res.status(201).json(CreateEmployeeResponse.parse(employee));
});

router.patch("/employees/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [employee] = await db
    .update(employeesTable)
    .set(parsed.data)
    .where(eq(employeesTable.id, params.data.id))
    .returning();

  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  res.json(UpdateEmployeeResponse.parse(employee));
});

router.delete("/employees/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(employeesTable).where(eq(employeesTable.id, params.data.id));
  res.sendStatus(204);
});

// Team members who can sign in to the admin panel (e.g. a project manager).
router.get("/admin-logins", requireAdmin, async (_req, res): Promise<void> => {
  const admins = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.role, "admin"));
  res.json(admins.map((a) => a.email.toLowerCase()));
});

// Give a team member an admin login, or set a new password if they already have one.
router.post("/employees/:id/admin-login", requireAdmin, async (req, res): Promise<void> => {
  const password = String(req.body?.password ?? "");
  if (password.length < 10) {
    res.status(400).json({ error: "Password must be at least 10 characters" });
    return;
  }
  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, Number(req.params.id)));
  if (!emp) {
    res.status(404).json({ error: "Team member not found" });
    return;
  }
  const email = emp.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);
  const [existing] = await db.select().from(usersTable).where(sql`lower(${usersTable.email}) = ${email}`);
  if (existing && existing.role !== "admin") {
    res.status(409).json({ error: "This email is already used by a client account" });
    return;
  }
  if (existing) {
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, existing.id));
  } else {
    await db.insert(usersTable).values({ name: emp.name, email, passwordHash, role: "admin" });
  }
  res.status(existing ? 200 : 201).json({ email });
});

router.delete("/employees/:id/admin-login", requireAdmin, async (req, res): Promise<void> => {
  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, Number(req.params.id)));
  if (!emp) {
    res.status(404).json({ error: "Team member not found" });
    return;
  }
  const email = emp.email.trim().toLowerCase();
  const [user] = await db.select().from(usersTable)
    .where(and(sql`lower(${usersTable.email}) = ${email}`, eq(usersTable.role, "admin")));
  if (!user) {
    res.json({ success: true });
    return;
  }
  if (user.id === req.session.userId) {
    res.status(400).json({ error: "You can't remove your own admin login" });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, user.id));
  res.json({ success: true });
});

export default router;
