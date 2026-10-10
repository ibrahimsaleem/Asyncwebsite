// One-off: set up Sound for Life (SFL Hearing Solutions) in the client portal.
// Safe to re-run: it reuses anything that already exists.
//   SFL_PASSWORD='...' [REPLACE_QUESTIONS=1] ../../scripts/node_modules/.bin/tsx --env-file=../../.env src/scripts/seed-sfl.ts
import bcrypt from "bcrypt";
import { and, eq, sql } from "drizzle-orm";
import {
  db, pool, usersTable, clientsTable, projectsTable,
  projectUpdatesTable, projectMilestonesTable, projectQuestionsTable,
} from "@workspace/db";
import { DEFAULT_MILESTONES } from "../routes/projectTracking";

const EMAIL = "syed.nawaz@soundforlife.in";
const PROJECT_NAME = "Sound for Life Voice Assistant";

// "Question | option | option": options show as clickable answers in the portal.
const QUESTIONS: [string, string[]][] = [
  ["A. Calls and volume", [
    "How many inbound calls do you get per day, across all clinics? | Under 50 | 50–100 | 100–300 | 300–500 | 500+",
    "How many of those are missed or come after hours, per day? | Under 10 | 10–30 | 30–50 | 50+ | Don't know",
    "How many inbound calls do you expect per month? | Under 1,500 | 1,500–3,000 | 3,000–10,000 | 10,000+ | Don't know",
    "How many outbound calls per month should the assistant make? | Under 1,000 | 1,000–5,000 | 5,000–20,000 | 20,000+ | Not sure yet",
    "What are your working hours? | Mon–Sat 10am–7pm | Mon–Sun 10am–7pm | Differs by clinic",
    "How many clinics do you have? | 1–5 | 6–20 | 21–50 | 50+",
    "Which cities or states are your clinics in?",
    "How are your phone numbers set up? | One central helpline | Each clinic has its own number | Both",
    "What do people call about most? Pick all that apply. | Book a hearing test | Hearing aid prices | Trial enquiry | Repair or service | Batteries | Complaints | Order or delivery status",
    "How is your MyOperator menu set up today: the options, and who each option goes to?",
  ]],
  ["B. Inbound calls", [
    "When should the assistant answer inbound calls? | All calls, 24/7 | Only after hours | Only calls your staff miss",
    "What should it handle on inbound calls? Pick all that apply. | Book clinic hearing test | Book home hearing test | Answer common questions | Share clinic address and timings | Trial enquiries | Repair or service requests | Take complaints",
    "When should it pass the call to a person? Pick all that apply. | Caller asks for a person | Complaint | Medical question | Ready to buy | Never, just take a message",
    "Who should those calls go to? | Central team | The caller's nearest clinic | A specific person (please name)",
  ]],
  ["C. Outbound calls", [
    "Which outbound calls do you want? Pick all that apply. | Call back missed calls | Upgrade or exchange offers to past customers | Trial follow-up (day 3) | Servicing reminders | Battery reminders | Appointment reminders | Feedback calls | Follow up new leads from ads",
    "How many past customers are on your list? | Under 5,000 | 5,000–20,000 | 20,000–1 lakh | 1 lakh+",
    "Where is that list kept? | Excel or Google Sheets | CRM | MyOperator | Other",
    "Best time to make outbound calls? Pick all that apply. | 10am–1pm | 1pm–5pm | 5pm–8pm",
  ]],
  ["D. Languages and voice", [
    "Besides Hindi and English, which regional languages do you need? Pick 4. | Tamil | Telugu | Kannada | Malayalam | Marathi | Bengali | Gujarati | Punjabi | Odia | Assamese | Urdu",
    "How should the assistant choose the language? | Detect the caller's language automatically | Ask the caller at the start | Use the clinic's regional language",
    "Which language should it start the call in? | Hindi | English | The clinic's regional language",
    "Which voice do you prefer? | Female | Male | No preference",
    "How should it introduce itself? | As Sound for Life | With a name, e.g. Priya from Sound for Life",
  ]],
  ["E. Information the assistant needs", [
    "Can the assistant tell callers prices? | Yes, exact prices | Only price ranges | No, only book a visit",
    "Do you offer home hearing tests? | Yes, in all cities | Yes, in some cities | No",
    "How are appointments booked today? | Excel or Google Sheets | CRM | Paper register | Booking software (please name)",
    "How long is a hearing test appointment? | 15 minutes | 30 minutes | 45 minutes | 60 minutes",
    "Clinic list, price list, offers and common questions: how will you share them? | Uploaded under Files | Will send by email | Need help preparing them",
    "What are your current offers, trial policy, warranty and exchange rules?",
    "Is there anything the assistant must never say? (For example: medical advice or price promises.)",
  ]],
  ["F. Systems", [
    "Which CRM do you use? | Zoho | LeadSquared | Salesforce | HubSpot | Built in-house | None",
    "Can we connect to your CRM through an API? | Yes | No | Don't know",
    "How should bookings be confirmed to the customer? | WhatsApp | SMS | Both | No confirmation",
    "Do you have a WhatsApp Business API account? | Yes | No | Don't know",
    "Which phone numbers should the assistant use? | Keep our current numbers (MyOperator) | Get new numbers | Not sure",
  ]],
  ["G. Compliance", [
    "Are callers told that calls are recorded? | Yes | No | Don't know",
    "Is your customer list checked against DND before calling? | Yes | No | Don't know",
    "Where must patient data be stored? | Must stay in India | No specific rule | Don't know",
  ]],
  ["H. Timeline and pricing", [
    "When would you like to go live? | Within 2 weeks | Within 1 month | 1–3 months | Flexible",
    "Would you like to start with a pilot? | Yes, one clinic | Yes, one city | No, all clinics at once",
    "If a pilot, which clinic or city?",
    "Which pricing do you prefer? | Fixed monthly plan with minutes included | Pay per minute | Not sure, please recommend",
    "Who else needs to approve the proposal?",
  ]],
];

const UPDATES = [
  "Intro call done. Thank you for walking us through how Sound for Life handles calls today.",
  "Demo done: after-hours calls, missed-call callbacks, home hearing test booking, upgrade and trial follow-up calls, Hindi support, and WhatsApp confirmations.",
  "Next step: please answer the questions in the Questions tab. Short answers are fine. With your answers we will prepare the requirements document and the proposal within 3–5 working days.",
];

async function main() {
  const password = process.env.SFL_PASSWORD;

  let [user] = await db.select().from(usersTable).where(sql`lower(${usersTable.email}) = ${EMAIL}`);
  if (!user) {
    if (!password || password.length < 10) throw new Error("Set SFL_PASSWORD (10+ characters) to create the login");
    [user] = await db.insert(usersTable)
      .values({ name: "Syed Nawaz", email: EMAIL, passwordHash: await bcrypt.hash(password, 10), role: "client" })
      .returning();
    console.log("Created login", EMAIL);
  } else console.log("Login already exists", EMAIL);

  let [client] = await db.select().from(clientsTable).where(eq(clientsTable.userId, user.id));
  if (!client) {
    [client] = await db.insert(clientsTable).values({
      userId: user.id,
      businessName: "SFL Hearing Solutions Pvt Ltd",
      industry: "Hearing care",
      phone: "7000455645",
      email: EMAIL,
      notes: "Brand: Sound for Life. POC: Syed Nawaz, CRM Manager. Uses MyOperator for IVR today. Intro call and demo done; client liked the demo and asked how to move forward. No contract or pricing agreed yet. Plan: questionnaire → requirements doc + proposal → contract + advance → build.",
    }).returning();
    console.log("Created client record");
  }

  let [project] = await db.select().from(projectsTable)
    .where(and(eq(projectsTable.clientId, client.id), eq(projectsTable.projectName, PROJECT_NAME)));
  if (!project) {
    [project] = await db.insert(projectsTable).values({
      clientId: client.id,
      projectName: PROJECT_NAME,
      description: "AI voice assistant for Sound for Life hearing clinics: answers calls 24/7 including after hours, calls back missed calls, books clinic and home hearing tests, calls past customers with upgrade and exchange offers, follows up during hearing-aid trials, sends servicing and battery reminders, speaks Hindi and English, confirms bookings on WhatsApp, and saves every call to your CRM. Replaces the \"press 1\" phone menu.",
      status: "onboarding",
      startDate: new Date().toISOString().slice(0, 10),
      latestUpdate: UPDATES[UPDATES.length - 1],
    }).returning();
    console.log("Created project", project.id);
  }

  const milestones = await db.select().from(projectMilestonesTable).where(eq(projectMilestonesTable.projectId, project.id));
  if (milestones.length === 0) {
    await db.insert(projectMilestonesTable).values(DEFAULT_MILESTONES.map((title, position) => ({
      projectId: project.id, title, position, doneAt: title === "Demo done" ? new Date() : null,
    })));
    console.log("Added checklist");
  }

  const updates = await db.select().from(projectUpdatesTable).where(eq(projectUpdatesTable.projectId, project.id));
  if (updates.length === 0) {
    const base = Date.now() - UPDATES.length * 60_000; // keep them in order
    await db.insert(projectUpdatesTable).values(UPDATES.map((message, i) => ({
      projectId: project.id, message, createdAt: new Date(base + i * 60_000),
    })));
    console.log("Added timeline");
  }

  let questions = await db.select().from(projectQuestionsTable).where(eq(projectQuestionsTable.projectId, project.id));
  // REPLACE_QUESTIONS=1 swaps in the current list, but never once the client has started answering.
  if (process.env.REPLACE_QUESTIONS === "1" && questions.length > 0) {
    if (questions.some((q) => q.answer)) throw new Error("Client has already answered some questions; not replacing");
    await db.delete(projectQuestionsTable).where(eq(projectQuestionsTable.projectId, project.id));
    questions = [];
    console.log("Removed old questions");
  }
  if (questions.length === 0) {
    let position = 0;
    await db.insert(projectQuestionsTable).values(QUESTIONS.flatMap(([section, qs]) => qs.map((line) => {
      const [question, ...options] = line.split("|").map((p) => p.trim());
      return { projectId: project.id, section, question, options: options.length ? options : null, position: position++ };
    })));
    console.log("Added", position, "questions");
  }

  console.log("Done. Client logs in at https://aicronics.com/login as", EMAIL);
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => pool.end());
