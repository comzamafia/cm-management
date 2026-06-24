import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const RESTAURANTS = ["Danforth", "IMM", "Junction", "Liberty", "Park Lawn", "SQ1", "YM"];

const WEEKLY = [
  { taskKey: "w1", name: "Review Email Inbox", category: "Operations", location: "All", days: [1,2,3,4,5] },
  { taskKey: "w2", name: "Review Catering Requests", category: "Catering", location: "All", days: [1,2,3,4,5] },
  { taskKey: "w3", name: "Review Manager Reports - All Locations", category: "Reporting", location: "All", days: [1,2,3,4,5] },
  { taskKey: "w4", name: "Follow Up on Operational Issues Identified in Reports", category: "Operations", location: "All", days: [1,2,3,4,5] },
  { taskKey: "w5", name: "Liberty Meeting", category: "Operations", location: "Liberty", days: [1] },
  { taskKey: "w6", name: "Liberty Follow-Up Actions", category: "Operations", location: "Liberty", days: [2] },
  { taskKey: "w7a", name: "BlackFox Tip Transfer", category: "Tips", location: "Liberty", days: [1] },
  { taskKey: "w7b", name: "BlackFox Tip Transfer", category: "Tips", location: "IMM", days: [1] },
  { taskKey: "w7c", name: "BlackFox Tip Transfer", category: "Tips", location: "Junction", days: [1] },
  { taskKey: "w7d", name: "BlackFox Tip Transfer", category: "Tips", location: "Danforth", days: [1] },
  { taskKey: "w7e", name: "BlackFox Tip Transfer", category: "Tips", location: "YM", days: [1] },
  { taskKey: "w7f", name: "BlackFox Tip Transfer", category: "Tips", location: "SQ1", days: [1] },
  { taskKey: "w8", name: "Midland Vendor Payment", category: "Vendor Payment", location: "All", days: [1,5] },
  { taskKey: "w9", name: "Sujee Credit/EMT Payment", category: "Vendor Payment", location: "All", days: [1] },
  { taskKey: "w10", name: "Review Labour Hours in 7Shifts", category: "Payroll", location: "All", days: [5] },
  { taskKey: "w11", name: "Nonna Lia Vendor Payment", category: "Vendor Payment", location: "All", days: [5] },
  { taskKey: "w12", name: "Weekly Operational Review & Follow-Up", category: "Reporting", location: "All", days: [5] },
];

const MONTHLY = [
  { taskKey: "m1", name: "Download & Review Timesheets (16th-31st)", dueDay: 2, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "m2", name: "Run Host & Bar Tips (16th-31st)", dueDay: 3, deadlineMode: "same", mode: "grid", applicable: ["Junction","SQ1","YM"] },
  { taskKey: "m3", name: "Vendor Payment — BMB", dueDay: 8, deadlineMode: "same", mode: "grid", applicable: RESTAURANTS },
  { taskKey: "m4", name: "Vendor Payment — J&S", dueDay: 8, deadlineMode: "same", mode: "grid", applicable: RESTAURANTS },
  { taskKey: "m5", name: "Vendor Payment — Kai Wei", dueDay: 8, deadlineMode: "same", mode: "grid", applicable: RESTAURANTS },
  { taskKey: "m6", name: "Vendor Payment — SongXing", dueDay: 8, deadlineMode: "same", mode: "grid", applicable: ["Park Lawn"] },
  { taskKey: "m7", name: "Vendor Payment — Kelly", dueDay: 8, deadlineMode: "same", mode: "grid", applicable: ["YM"] },
  { taskKey: "m8", name: "Vendor Payment — Bae Greens", dueDay: 8, deadlineMode: "same", mode: "grid", applicable: RESTAURANTS },
  { taskKey: "m9", name: "Vendor Payment — Tofu", dueDay: 8, deadlineMode: "same", mode: "grid", applicable: RESTAURANTS },
  { taskKey: "m10", name: "Vendor Payment — Everyday Micro", dueDay: 8, deadlineMode: "same", mode: "grid", applicable: RESTAURANTS },
  { taskKey: "m11", name: "Vendor Payment — Juice Concepts", dueDay: 8, deadlineMode: "same", mode: "grid", applicable: RESTAURANTS },
  { taskKey: "m12", name: "Vendor Payment — Oceans", dueDay: 8, deadlineMode: "same", mode: "grid", applicable: RESTAURANTS },
  { taskKey: "m13", name: "Remittance Payment", dueDay: 10, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "m14", name: "Monthly Kitchen Tips Calculation", dueDay: 12, deadlineMode: "next_month_15", mode: "grid", applicable: RESTAURANTS },
  { taskKey: "m15", name: "Download & Review Timesheets (1st-15th)", dueDay: 17, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "m16", name: "Run Host & Bar Tips (1st-15th)", dueDay: 18, deadlineMode: "same", mode: "grid", applicable: ["Junction","SQ1","YM"] },
];

const VENDORS_LIST = [
  "BMB", "J&S", "Kai Wei", "SongXing (Park Lawn)", "Kelly (YM)",
  "Bae Greens", "Tofu", "Everyday Micro", "Juice Concepts", "Oceans",
];

async function main() {
  let created = 0;

  for (let i = 0; i < WEEKLY.length; i++) {
    const t = WEEKLY[i];
    const exists = await p.actionPlanTask.findUnique({ where: { taskKey: t.taskKey } });
    if (exists) { console.log("SKIP:", t.taskKey); continue; }
    await p.actionPlanTask.create({
      data: { tab: "weekly", taskKey: t.taskKey, name: t.name, category: t.category, location: t.location, days: t.days, sortOrder: i },
    });
    console.log("Created:", t.taskKey, t.name);
    created++;
  }

  for (let i = 0; i < MONTHLY.length; i++) {
    const t = MONTHLY[i];
    const exists = await p.actionPlanTask.findUnique({ where: { taskKey: t.taskKey } });
    if (exists) { console.log("SKIP:", t.taskKey); continue; }
    await p.actionPlanTask.create({
      data: { tab: "monthly", taskKey: t.taskKey, name: t.name, dueDay: t.dueDay, deadlineMode: t.deadlineMode, mode: t.mode, applicable: t.applicable, sortOrder: i },
    });
    console.log("Created:", t.taskKey, t.name);
    created++;
  }

  for (let i = 0; i < VENDORS_LIST.length; i++) {
    const v = VENDORS_LIST[i];
    const key = `v-${v}`;
    const exists = await p.actionPlanTask.findUnique({ where: { taskKey: key } });
    if (exists) { console.log("SKIP:", key); continue; }
    await p.actionPlanTask.create({
      data: { tab: "vendor", taskKey: key, name: v, sortOrder: i },
    });
    console.log("Created:", key, v);
    created++;
  }

  console.log("\nTotal created:", created);
  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
