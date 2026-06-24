import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const YORKMILLS_ID = "cmq9p5o0f000cl5049ghi17nt";
const ADMIN_ID = "cmq8jcoyy0003l2045vyu6suw";

// UTC date helper (month is 1-based here for readability).
const d = (y, m, day) => new Date(Date.UTC(y, m - 1, day));

const CATEGORY_LABEL = {
  PEST_CONTROL: "Pest Control",
  GREASE_TRAP: "Grease Trap",
  HOOD_CLEANING: "Hood Cleaning",
  FIRE_SAFETY: "Fire Safety",
  HVAC: "HVAC / Air-con",
  EQUIPMENT: "Equipment Service",
  SANITATION: "Sanitation",
  LICENSE_PERMIT: "License / Permit",
  OTHER: "Other",
};
const INTERVAL_LABEL = {
  WEEKLY: "weekly",
  BIWEEKLY: "bi-weekly",
  MONTHLY: "monthly",
  BIMONTHLY: "every 8 weeks",
  QUARTERLY: "quarterly",
  SEMI_ANNUAL: "semi-annual",
  ANNUAL: "annual",
};

// York Mills maintenance schedule — exact dates honoured from the sheet.
const SCHEDULES = [
  { name: "CDN Linen", category: "OTHER", interval: "WEEKLY", vendor: "CDN Linen",
    last: d(2026, 6, 23), next: d(2026, 6, 30), notes: "Linen service." },
  { name: "Nella (Kitchen Equipment Service)", category: "EQUIPMENT", interval: "BIWEEKLY", vendor: "Nella",
    last: d(2026, 6, 23), next: d(2026, 7, 7), notes: "Frequency: Weekly / Bi-weekly." },
  { name: "Window Cleaning", category: "SANITATION", interval: "BIWEEKLY", vendor: "Four Season",
    last: d(2026, 6, 19), next: d(2026, 7, 3), notes: null },
  { name: "Hood Cleaning", category: "HOOD_CLEANING", interval: "BIWEEKLY", vendor: "Aspro (filter wizz)",
    last: d(2026, 6, 16), next: d(2026, 6, 30), notes: null },
  { name: "Pest Control", category: "PEST_CONTROL", interval: "MONTHLY", vendor: "Seal",
    last: d(2026, 6, 23), next: d(2026, 7, 23), notes: null },
  { name: "Grease Trap", category: "GREASE_TRAP", interval: "MONTHLY", vendor: "Green Oil",
    last: d(2026, 6, 3), next: d(2026, 6, 17), notes: null },
  { name: "BC Chemicals (Dishwasher Maintenance)", category: "EQUIPMENT", interval: "MONTHLY", vendor: "BC Chemicals",
    last: d(2026, 6, 17), next: d(2026, 7, 18), notes: "Dishwasher maintenance." },
  { name: "Craft & Draft (Beer Line Service)", category: "EQUIPMENT", interval: "BIMONTHLY", vendor: "Craft & Draft",
    last: d(2026, 6, 23), next: d(2026, 8, 18), notes: "Frequency: 8 weeks. Beer line service." },
  { name: "Extensive Hood Cleaning", category: "HOOD_CLEANING", interval: "QUARTERLY", vendor: "American Hood Cleaning",
    last: d(2026, 5, 13), next: d(2026, 8, 13), notes: "Frequency: every 3 months." },
  { name: "Health Inspection", category: "LICENSE_PERMIT", interval: "ANNUAL", vendor: "City Health Dept",
    last: d(2026, 6, 22), next: d(2027, 6, 22), notes: "Random schedule — next visit unscheduled (Waiting)." },
];

function describe(s) {
  const parts = [
    `Recurring ${INTERVAL_LABEL[s.interval]} compliance service.`,
    `Last serviced: ${s.last.toISOString().slice(0, 10)}.`,
  ];
  if (s.vendor) parts.push(`Vendor: ${s.vendor}.`);
  return parts.join(" ");
}

async function main() {
  let created = 0;
  for (const s of SCHEDULES) {
    const exists = await p.complianceSchedule.findFirst({
      where: { name: s.name, locationId: YORKMILLS_ID },
    });
    if (exists) {
      console.log("SKIP (exists):", s.name);
      continue;
    }

    await p.$transaction(async (tx) => {
      const schedule = await tx.complianceSchedule.create({
        data: {
          name: s.name,
          category: s.category,
          interval: s.interval,
          locationId: YORKMILLS_ID,
          assigneeId: null,
          vendor: s.vendor,
          priority: "HIGH",
          notes: s.notes,
          lastServiceDate: s.last,
          nextDueDate: s.next, // honour the sheet's Next Scheduled Date exactly
          createdById: ADMIN_ID,
        },
      });

      const task = await tx.task.create({
        data: {
          title: `[${CATEGORY_LABEL[s.category]}] ${s.name}`,
          description: describe(s),
          type: "RECURRING",
          priority: "HIGH",
          locationId: YORKMILLS_ID,
          assignerId: ADMIN_ID,
          assigneeId: null,
          department: "Compliance",
          complianceScheduleId: schedule.id,
          dueAt: s.next,
          proofRequired: false,
        },
      });

      await tx.complianceSchedule.update({
        where: { id: schedule.id },
        data: { currentTaskId: task.id },
      });

      await tx.activityLog.create({
        data: {
          userId: ADMIN_ID,
          action: "compliance.created",
          entity: "ComplianceSchedule",
          entityId: schedule.id,
          locationId: YORKMILLS_ID,
          meta: { name: schedule.name, category: schedule.category, nextDueDate: s.next.toISOString() },
        },
      });
    });

    console.log(
      "Created:",
      s.name,
      `(${s.interval}, last ${s.last.toISOString().slice(0, 10)} → next ${s.next.toISOString().slice(0, 10)})`,
    );
    created++;
  }

  console.log("\nCompliance schedules created for York Mills:", created);
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
