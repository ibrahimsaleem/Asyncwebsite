import bcrypt from "bcrypt";
import { db } from "@workspace/db";
import {
  usersTable,
  clientsTable,
  employeesTable,
  projectsTable,
  projectAssignmentsTable,
  invoicesTable,
  featureRequestsTable,
} from "@workspace/db";

export async function seedIfEmpty() {
  const existingUsers = await db.select().from(usersTable);
  if (existingUsers.length > 0) return;

  // Create admin user
  const adminHash = await bcrypt.hash("admin123", 10);
  await db.insert(usersTable).values({
    name: "Ibrahim Saleem",
    email: "admin@aisync.ai",
    passwordHash: adminHash,
    role: "admin",
  });

  // Create client user
  const clientHash = await bcrypt.hash("client123", 10);
  const [clientUser] = await db.insert(usersTable).values({
    name: "Dr. Ahmed Hassan",
    email: "client@demo.com",
    passwordHash: clientHash,
    role: "client",
  }).returning();

  // Create client profile
  const [client] = await db.insert(clientsTable).values({
    userId: clientUser.id,
    businessName: "Demo Dental Clinic",
    industry: "Healthcare",
    phone: "+1 (555) 234-5678",
    email: "client@demo.com",
    notes: "VIP client — priority support",
  }).returning();

  // Create employees
  const [emp1] = await db.insert(employeesTable).values({
    name: "Ibrahim Saleem",
    role: "AI Solutions Lead",
    email: "ibrahim@aisync.ai",
  }).returning();

  const [emp2] = await db.insert(employeesTable).values({
    name: "Sarah Khan",
    role: "Voice Agent Developer",
    email: "sarah@aisync.ai",
  }).returning();

  const [emp3] = await db.insert(employeesTable).values({
    name: "Alex Johnson",
    role: "Client Success Manager",
    email: "alex@aisync.ai",
  }).returning();

  // Create project
  const [project] = await db.insert(projectsTable).values({
    clientId: client.id,
    projectName: "24/7 AI Receptionist",
    description: "A fully automated AI voice agent that handles all inbound calls, books appointments, answers FAQs, and syncs with the clinic's calendar system 24 hours a day.",
    status: "build_phase",
    startDate: "2026-06-01",
    expectedCompletionDate: "2026-07-15",
    latestUpdate: "We have completed onboarding and collected FAQs. The AI voice agent is currently being configured with your booking rules and brand voice. Integration with your calendar system is in progress.",
  }).returning();

  // Assign employees to project
  await db.insert(projectAssignmentsTable).values([
    { projectId: project.id, employeeId: emp1.id },
    { projectId: project.id, employeeId: emp2.id },
    { projectId: project.id, employeeId: emp3.id },
  ]);

  // Create invoice
  await db.insert(invoicesTable).values({
    clientId: client.id,
    projectId: project.id,
    invoiceNumber: "INV-2026-001",
    totalAmount: "2500",
    paidAmount: "1000",
    dueAmount: "1500",
    status: "partial",
    dueDate: "2026-07-30",
    notes: "50% deposit received. Remaining balance due upon project completion.",
  });

  // Create a sample feature request
  await db.insert(featureRequestsTable).values({
    clientId: client.id,
    projectId: project.id,
    title: "Add SMS appointment reminders",
    description: "After booking, automatically send the patient a text message reminder 24 hours and 2 hours before their appointment.",
    priority: "high",
    status: "in_review",
  });
}
