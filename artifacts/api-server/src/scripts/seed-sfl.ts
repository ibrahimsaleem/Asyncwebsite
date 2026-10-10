// One-off: set up Sound for Life (SFL Hearing Solutions) in the client portal.
// Safe to re-run: it reuses anything that already exists.
//   SFL_PASSWORD='...' ../../scripts/node_modules/.bin/tsx --env-file=../../.env src/scripts/seed-sfl.ts
import bcrypt from "bcrypt";
import { and, eq, sql } from "drizzle-orm";
import {
  db, pool, usersTable, clientsTable, projectsTable,
  projectUpdatesTable, projectMilestonesTable, projectQuestionsTable,
} from "@workspace/db";
import { DEFAULT_MILESTONES } from "../routes/projectTracking";

const EMAIL = "syed.nawaz@soundforlife.in";
const PROJECT_NAME = "Sound for Life Voice Assistant";

const QUESTIONS: [string, string[]][] = [
  ["A. Calls today", [
    "How many calls do you get per day across all clinics? How many come after hours or go unanswered?",
    "What are your working hours, and do they differ by clinic?",
    "How many clinics do you have, and in which cities? Is there a central helpline or does each clinic have its own number?",
    "What are the most common reasons people call? (For example: booking a hearing test, trial enquiries, price questions, repairs, batteries, complaints.)",
    "How is your MyOperator IVR set up today: the menu options, who each option goes to, and which numbers are used?",
  ]],
  ["B. What the assistant should do", [
    "Inbound: should it answer every call, only after hours, or around the clock?",
    "Should it call back missed calls automatically?",
    "Should it book hearing tests, both at a clinic and at home?",
    "Outbound: should it call past customers with upgrade or exchange offers?",
    "Should it make follow-up calls during hearing-aid trials (for example on day 3)?",
    "Should it send reminders for servicing, batteries, and follow-up appointments?",
    "Anything else? (For example: collecting feedback, payment reminders, insurance questions.)",
    "When should the assistant pass the call to a person, and who should it go to?",
    "Please rank the items above by priority (most important first).",
  ]],
  ["C. Language and voice", [
    "Which languages do you need: Hindi, English, Hinglish, any regional languages?",
    "Do you prefer a female or male voice? Should the assistant introduce itself as Sound for Life, or by a name?",
  ]],
  ["D. Information the assistant needs", [
    "Please share a list of clinics with addresses, timings, and the services each one offers (you can upload it under Files).",
    "How do bookings work today: what calendar or software do you use, how long is an appointment, and are home visits available (in which areas)?",
    "Products and prices: can the assistant quote price ranges, or should it only book a visit?",
    "What are your current offers, trial policy, warranty, and exchange rules?",
    "What are the common customer questions, and your standard answers?",
    "Is there anything the assistant must never say? (For example: medical advice or price commitments.)",
  ]],
  ["E. Systems", [
    "Which CRM do you use, and does it have an API?",
    "Should bookings appear in the CRM, a calendar, or both?",
    "Do you have a WhatsApp Business API account for confirmations?",
    "Should we keep your current numbers (through MyOperator) or set up new ones?",
    "For outbound calls: roughly how big is your past-customer list, and in what format is it kept?",
  ]],
  ["F. Compliance", [
    "Are customers told that calls are recorded today? Any DND or TRAI rules we should follow for outbound calls?",
    "Any data-storage or privacy requirements for patient information?",
  ]],
  ["G. Commercial and timeline", [
    "What is your target go-live date, and is there a clinic you would like to pilot first?",
    "What call volume do you expect per month, inbound and outbound, so we can price it accurately?",
    "Do you prefer monthly or per-minute pricing? Are there budget or approval steps on your side?",
    "Who else should review the proposal and sign off?",
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

  const questions = await db.select().from(projectQuestionsTable).where(eq(projectQuestionsTable.projectId, project.id));
  if (questions.length === 0) {
    let position = 0;
    await db.insert(projectQuestionsTable).values(QUESTIONS.flatMap(([section, qs]) =>
      qs.map((question) => ({ projectId: project.id, section, question, position: position++ }))));
    console.log("Added", position, "questions");
  }

  console.log("Done. Client logs in at https://aicronics.com/login as", EMAIL);
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => pool.end());
