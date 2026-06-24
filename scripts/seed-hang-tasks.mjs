import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const HANG_ID = "cmqfi1g790001kw044jtels01";
const ADMIN_ID = "cmq8jcoyy0003l2045vyu6suw";

// Locations. Company-wide ("All") tasks pin to Head Office so the generator
// creates exactly ONE task (a null locationId fans out to every location).
const HQ_ID = "cmq8rx9sh0000l104ivpmre50";
const LIBERTY_ID = "cmq9p0qtz0006l504fzlduxdx";

// ── Weekly templates ──────────────────────────────────────────────────────
// DAILY = the tracker's Mon–Fri ops tasks. WEEKLY = day-specific (weekDay:
// 0=Sun..6=Sat). Tasks that recur on two weekdays become two templates.
const weeklyTemplates = [
  // Daily operations (Mon–Fri in the tracker → DAILY here)
  { name: "Review Email Inbox", freq: "DAILY", dept: "Operations", items: ["Review Email Inbox"] },
  { name: "Review Catering Requests", freq: "DAILY", dept: "Catering", items: ["Review Catering Requests"] },
  { name: "Review Manager Reports - All Locations", freq: "DAILY", dept: "Reporting", items: ["Review Manager Reports - All Locations"] },
  { name: "Follow Up on Operational Issues", freq: "DAILY", dept: "Operations", items: ["Follow up on operational issues identified in reports"] },

  // Monday
  { name: "Liberty Meeting", freq: "WEEKLY", weekDay: 1, dept: "Operations", locationId: LIBERTY_ID, items: ["Liberty Meeting"] },
  {
    name: "BlackFox Tip Transfer", freq: "WEEKLY", weekDay: 1, dept: "Tips",
    items: ["Liberty", "IMM", "Junction", "Danforth", "YM", "SQ1"],
  },
  { name: "Sujee Credit/EMT Payment", freq: "WEEKLY", weekDay: 1, dept: "Vendor Payment", priority: "HIGH", items: ["Sujee Credit/EMT Payment"] },
  { name: "Midland Vendor Payment (Monday)", freq: "WEEKLY", weekDay: 1, dept: "Vendor Payment", priority: "HIGH", items: ["Midland Vendor Payment"] },

  // Tuesday
  { name: "Liberty Follow-Up Actions", freq: "WEEKLY", weekDay: 2, dept: "Operations", locationId: LIBERTY_ID, items: ["Liberty Follow-Up Actions"] },

  // Friday
  { name: "Review Labour Hours in 7Shifts", freq: "WEEKLY", weekDay: 5, dept: "Payroll", priority: "HIGH", items: ["Review Labour Hours in 7Shifts"] },
  { name: "Nonna Lia Vendor Payment", freq: "WEEKLY", weekDay: 5, dept: "Vendor Payment", priority: "HIGH", items: ["Nonna Lia Vendor Payment"] },
  { name: "Midland Vendor Payment (Friday)", freq: "WEEKLY", weekDay: 5, dept: "Vendor Payment", priority: "HIGH", items: ["Midland Vendor Payment"] },
  { name: "Weekly Operational Review & Follow-Up", freq: "WEEKLY", weekDay: 5, dept: "Reporting", items: ["Weekly Operational Review & Follow-Up"] },
];

// ── Monthly templates ─────────────────────────────────────────────────────
// monthDay = day of month the cycle generates (tracker "Due" day).
const monthlyTemplates = [
  { name: "Download & Review Timesheets (16th-31st)", monthDay: 2, dept: "Payroll", priority: "HIGH", items: ["Download & Review Timesheets (16th-31st)"] },
  { name: "Run Host & Bar Tips (16th-31st)", monthDay: 3, dept: "Tips", items: ["Junction", "SQ1", "YM"] },
  {
    name: "Vendor Payments (8th)", monthDay: 8, dept: "Vendor Payment", priority: "HIGH",
    items: ["BMB", "J&S", "Kai Wei", "SongXing (Park Lawn)", "Kelly (YM)", "Bae Greens", "Tofu", "Everyday Micro", "Juice Concepts", "Oceans"],
  },
  { name: "Remittance Payment", monthDay: 10, dept: "Payroll", priority: "HIGH", items: ["Remittance Payment"] },
  {
    name: "Monthly Kitchen Tips Calculation", monthDay: 12, dept: "Tips",
    items: ["Danforth", "IMM", "Junction", "Liberty", "Park Lawn", "SQ1", "YM"],
  },
  { name: "Download & Review Timesheets (1st-15th)", monthDay: 17, dept: "Payroll", priority: "HIGH", items: ["Download & Review Timesheets (1st-15th)"] },
  { name: "Run Host & Bar Tips (1st-15th)", monthDay: 18, dept: "Tips", items: ["Junction", "SQ1", "YM"] },
];

async function main() {
  let created = 0;

  for (const t of weeklyTemplates) {
    const exists = await p.checklistTemplate.findFirst({ where: { name: t.name, assigneeId: HANG_ID } });
    if (exists) { console.log("SKIP (exists):", t.name); continue; }
    await p.checklistTemplate.create({
      data: {
        name: t.name,
        frequency: t.freq,
        items: t.items,
        locationId: t.locationId ?? HQ_ID,
        autoGenerateHour: 8,
        weekDay: t.freq === "WEEKLY" ? t.weekDay : null,
        priority: t.priority ?? "MEDIUM",
        department: t.dept,
        proofRequired: false,
        createdById: ADMIN_ID,
        assigneeId: HANG_ID,
      },
    });
    console.log(`Created [${t.freq}]:`, t.name);
    created++;
  }

  for (const t of monthlyTemplates) {
    const exists = await p.checklistTemplate.findFirst({ where: { name: t.name, assigneeId: HANG_ID } });
    if (exists) { console.log("SKIP (exists):", t.name); continue; }
    await p.checklistTemplate.create({
      data: {
        name: t.name,
        frequency: "MONTHLY",
        items: t.items,
        locationId: HQ_ID,
        autoGenerateHour: 8,
        monthDay: t.monthDay,
        priority: t.priority ?? "MEDIUM",
        department: t.dept,
        proofRequired: false,
        createdById: ADMIN_ID,
        assigneeId: HANG_ID,
      },
    });
    console.log("Created [MONTHLY]:", t.name);
    created++;
  }

  console.log("\nChecklist templates created for Hang:", created);
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
