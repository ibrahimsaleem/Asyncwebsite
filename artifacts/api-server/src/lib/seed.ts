import bcrypt from "bcrypt";
import { db } from "@workspace/db";
import {
  usersTable, clientsTable, employeesTable, projectsTable,
  projectAssignmentsTable, invoicesTable, featureRequestsTable, demoRequestsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

export async function seedIfEmpty() {
  const allUsers = await db.select().from(usersTable);
  const byEmail = new Map(allUsers.map((u) => [u.email, u]));

  // ── Admin ───────────────────────────────────────────────────────────
  let admin = byEmail.get("admin@aisync.ai");
  if (!admin) {
    const hash = await bcrypt.hash("admin123", 10);
    [admin] = await db.insert(usersTable).values({
      name: "Ibrahim Saleem", email: "admin@aisync.ai", passwordHash: hash, role: "admin",
    }).returning();
  }

  // ── Employees ────────────────────────────────────────────────────────
  const allEmployees = await db.select().from(employeesTable);
  let emp1 = allEmployees.find((e) => e.email === "ibrahim@aisync.ai");
  let emp2 = allEmployees.find((e) => e.email === "sarah@aisync.ai");
  let emp3 = allEmployees.find((e) => e.email === "alex@aisync.ai");

  if (!emp1) [emp1] = await db.insert(employeesTable).values({ name: "Ibrahim Saleem", role: "AI Solutions Lead", email: "ibrahim@aisync.ai" }).returning();
  if (!emp2) [emp2] = await db.insert(employeesTable).values({ name: "Sarah Khan", role: "Voice Agent Developer", email: "sarah@aisync.ai" }).returning();
  if (!emp3) [emp3] = await db.insert(employeesTable).values({ name: "Alex Johnson", role: "Client Success Manager", email: "alex@aisync.ai" }).returning();

  // ── Client factory ───────────────────────────────────────────────────
  async function ensureClient(
    userEmail: string, userName: string, userPassword: string,
    clientData: { businessName: string; industry: string; phone: string; notes: string },
    projectData: { projectName: string; description: string; status: string; startDate: string; expectedCompletionDate: string; latestUpdate: string },
    invoiceData: { invoiceNumber: string; totalAmount: string; paidAmount: string; dueAmount: string; status: string; dueDate: string; notes: string },
    featureData: { title: string; description: string; priority: string; status: string }[],
    assignees: typeof emp1[],
  ) {
    let user = byEmail.get(userEmail);
    if (!user) {
      const hash = await bcrypt.hash(userPassword, 10);
      [user] = await db.insert(usersTable).values({ name: userName, email: userEmail, passwordHash: hash, role: "client" }).returning();
    }

    const [existingClient] = await db.select().from(clientsTable).where(eq(clientsTable.userId, user.id));
    if (existingClient) return;

    const [client] = await db.insert(clientsTable).values({ userId: user.id, email: userEmail, ...clientData }).returning();
    const [project] = await db.insert(projectsTable).values({ clientId: client.id, ...projectData } as any).returning();

    await db.insert(projectAssignmentsTable).values(
      assignees.filter(Boolean).map((e) => ({ projectId: project.id, employeeId: e!.id }))
    );

    await db.insert(invoicesTable).values({ clientId: client.id, projectId: project.id, ...invoiceData });

    for (const feat of featureData) {
      await db.insert(featureRequestsTable).values({ clientId: client.id, projectId: project.id, ...feat });
    }
  }

  // ── Client 1 — Dental Clinic ─────────────────────────────────────────
  await ensureClient(
    "client@demo.com", "Dr. Ahmed Hassan", "client123",
    { businessName: "Demo Dental Clinic", industry: "Healthcare", phone: "+1 (555) 234-5678", notes: "VIP client — priority support. 3 chair practice, peak hours Mon/Wed/Fri 9am–5pm." },
    { projectName: "24/7 AI Receptionist", description: "Fully automated AI voice agent handling all inbound calls, booking appointments, answering FAQs, and syncing with the clinic calendar 24/7.", status: "build_phase", startDate: "2026-06-01", expectedCompletionDate: "2026-07-15", latestUpdate: "AI voice agent configuration is 80% complete. Calendar sync with Google Calendar is live. Knowledge base training on clinic-specific FAQs in progress — 120 Q&A pairs loaded." },
    { invoiceNumber: "INV-2026-001", totalAmount: "2500", paidAmount: "1000", dueAmount: "1500", status: "partial", dueDate: "2026-07-30", notes: "50% setup deposit received. Remaining balance due upon project completion and go-live." },
    [
      { title: "SMS appointment reminders", description: "Send patients a text reminder 24 hours and 2 hours before their appointment with a link to reschedule.", priority: "high", status: "in_review" },
      { title: "Multi-language support (Arabic)", description: "Agent should switch to Arabic when caller speaks Arabic, serving our Arabic-speaking patient base.", priority: "medium", status: "new" },
    ],
    [emp1, emp2, emp3],
  );

  // ── Client 2 — Restaurant ─────────────────────────────────────────────
  await ensureClient(
    "marco@bellavista.com", "Marco Antonini", "client123",
    { businessName: "Bella Vista Ristorante", industry: "Restaurants", phone: "+1 (555) 391-2047", notes: "High-volume restaurant. Peak: Fri & Sat 6–10pm. Handles 80+ reservation calls per weekend night." },
    { projectName: "AI Reservation & Hostess Agent", description: "24/7 reservation handling, waitlist management, and guest FAQ responses for a high-volume Italian fine dining restaurant.", status: "testing", startDate: "2026-05-10", expectedCompletionDate: "2026-06-30", latestUpdate: "Agent handling 95% of test calls successfully. Final edge-case testing underway (large party bookings, same-day cancellations). Launch confirmed for July 1st." },
    { invoiceNumber: "INV-2026-002", totalAmount: "1800", paidAmount: "1800", dueAmount: "0", status: "paid", dueDate: "2026-06-15", notes: "Paid in full ahead of schedule. Excellent client." },
    [
      { title: "OpenTable waitlist integration", description: "When fully booked, agent should add guests to OpenTable digital waitlist and send them a confirmation text.", priority: "high", status: "approved" },
      { title: "Post-dining feedback call", description: "Day after the visit, agent calls to collect a quick satisfaction rating. Negative feedback escalates to manager.", priority: "medium", status: "new" },
    ],
    [emp1, emp2],
  );

  // ── Client 3 — Real Estate ────────────────────────────────────────────
  await ensureClient(
    "sarah@greenleafprop.com", "Sarah Chen", "client123",
    { businessName: "GreenLeaf Properties", industry: "Real Estate", phone: "+1 (555) 487-9934", notes: "Growing brokerage — 3 agents now, targeting 5 by Q4. Receives 30+ inquiry calls per week across 12 active listings." },
    { projectName: "Property Inquiry & Viewing Scheduler", description: "AI agent that handles inbound property inquiries, qualifies buyer/renter leads with 5 key questions, and schedules viewings with the right agent.", status: "demo_phase", startDate: "2026-05-20", expectedCompletionDate: "2026-07-01", latestUpdate: "Live demo agent is fielding test calls. Client reviewing qualification question flow — requested 2 adjustments to buyer pre-qualification script. Minor knowledge base update in progress for new listings." },
    { invoiceNumber: "INV-2026-003", totalAmount: "3200", paidAmount: "1600", dueAmount: "1600", status: "partial", dueDate: "2026-08-01", notes: "Phase 1 invoice — onboarding and development. Phase 2 invoice issued post-launch." },
    [
      { title: "HubSpot CRM sync on lead qualification", description: "When agent qualifies a lead, automatically create a HubSpot contact with call transcript summary and lead score.", priority: "high", status: "in_review" },
      { title: "Post-viewing follow-up call", description: "Agent calls the prospect 24 hours after a viewing to collect feedback and gauge interest level.", priority: "medium", status: "new" },
      { title: "Listing price update notifications", description: "When a listing price drops, agent should proactively call previous inquiries who expressed interest.", priority: "low", status: "new" },
    ],
    [emp2, emp3],
  );

  // ── Client 4 — IT Support ─────────────────────────────────────────────
  await ensureClient(
    "james@techfixpro.com", "James Okafor", "client123",
    { businessName: "TechFix Pro", industry: "IT Support", phone: "+1 (555) 618-3301", notes: "Completed project. Monthly check-in call scheduled. Excellent NPS — referred 2 leads. Consider upsell: outbound follow-up agent." },
    { projectName: "IT Helpdesk First-Response Agent", description: "AI voice agent handling Tier-1 IT support: password resets, VPN connectivity, device setup guides, and automatic ticket creation in Jira.", status: "completed", startDate: "2026-03-15", expectedCompletionDate: "2026-05-15", latestUpdate: "Project completed and live since May 16th. Agent autonomously resolves 72% of inbound calls. Client reported 45% reduction in hold times. 98% caller satisfaction on post-call surveys. Monthly performance reports active." },
    { invoiceNumber: "INV-2026-004", totalAmount: "4100", paidAmount: "4100", dueAmount: "0", status: "paid", dueDate: "2026-05-20", notes: "All invoices settled. Project delivered on time and on budget." },
    [
      { title: "Priority escalation & on-call alerts", description: "When agent cannot resolve an issue after 3 attempts, create a P1 Jira ticket and SMS the on-call engineer immediately.", priority: "high", status: "completed" },
      { title: "Monthly performance report email", description: "Auto-generate and deliver a monthly PDF report: call volume, resolution rate, top issue categories, CSAT score.", priority: "medium", status: "completed" },
    ],
    [emp1, emp3],
  );

  // ── Client 5 — Fitness ────────────────────────────────────────────────
  await ensureClient(
    "lisa@cityfitnesshub.com", "Lisa Moreau", "client123",
    { businessName: "City Fitness Hub", industry: "Fitness & Wellness", phone: "+1 (555) 752-8810", notes: "New client. 2-location gym. Membership inquiries very high — currently losing ~25 calls/day to voicemail. Hot lead." },
    { projectName: "Membership & Class Booking Agent", description: "AI agent handling membership inquiries, class schedule questions, trial class bookings, and existing member support calls 24/7.", status: "onboarding", startDate: "2026-06-20", expectedCompletionDate: "2026-08-10", latestUpdate: "Onboarding call completed June 22nd. Knowledge base questionnaire sent — awaiting client's class schedule, membership tiers, and FAQ document. Agent build starts once materials received." },
    { invoiceNumber: "INV-2026-005", totalAmount: "2200", paidAmount: "2200", dueAmount: "0", status: "paid", dueDate: "2026-06-25", notes: "Setup and onboarding fee paid upfront. Monthly subscription starts on go-live date." },
    [
      { title: "Mindbody booking system integration", description: "Connect agent directly to Mindbody so it can check real-time class availability and book members in instantly.", priority: "high", status: "new" },
      { title: "Trial membership follow-up sequence", description: "After trial class, agent calls the prospect within 2 hours to offer a membership deal while interest is high.", priority: "high", status: "new" },
    ],
    [emp1, emp2],
  );

  // ── Demo Requests ──────────────────────────────────────────────────────
  const existingDemos = await db.select().from(demoRequestsTable);
  if (existingDemos.length === 0) {
    await db.insert(demoRequestsTable).values([
      { name: "Priya Sharma", businessName: "Lotus Spa & Wellness", email: "priya@lotuswellness.com", phone: "+1 (555) 721-4432", industry: "Clinics", message: "We run a med spa with 3 locations and are losing dozens of booking calls every week. Very interested in your solution — can we see a healthcare demo?" },
      { name: "Derek Walsh", businessName: "Walsh Plumbing & HVAC", email: "derek@walshplumbing.com", phone: "+1 (555) 834-0192", industry: "Service Trades", message: "Emergency calls come in at all hours. I need an agent that can take the call, get the address and issue details, and dispatch my on-call plumber automatically." },
      { name: "Monica Fleury", businessName: "Fleury Law Group", email: "m.fleury@fleurylaw.com", phone: "+1 (555) 293-6600", industry: "Other", message: "We need an agent to handle initial client intake calls and route to the correct practice area attorney. HIPAA compliance and call recording are both required." },
    ]);
  }
}
