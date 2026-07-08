// One-off import of the "Service Calendar" tab (CM SERVICE CALENDAR.xlsx) into
// the Compliance module. Follows the exact convention already used by
// scripts/seed-yorkmills-compliance.mjs (category/interval mapping, notes style,
// honour the sheet's Next Scheduled Date when it's a real date, otherwise compute
// from last-service + interval; spawn a recurring task + activity log per schedule).
//
// Scope (confirmed with user):
//   - Import: Park lawn, Liberty, Danforth, Junction, Mississauga, Imm Thai (new).
//   - Skip:  York Mills (already imported in a prior run).
//   - "6 Weeks" frequency -> BIMONTHLY (nearest 8-week cycle), noted in the record.
//
// Stale branches (Mississauga ~May 2025, Imm Thai ~Jan–Mar 2025) are imported
// as-is per the sheet — their past dates make schedules show as overdue, which
// truthfully reflects that they need re-verification. Rows with NO service date
// in the sheet get a documented placeholder anchor (flagged in notes), never a
// silently invented date.
//
// Idempotent: skips any (name, location) that already exists.
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const ADMIN_ID = "cmq8jcoyy0003l2045vyu6suw";

const d = (y, m, day) => new Date(Date.UTC(y, m - 1, day));

const CATEGORY_LABEL = {
  PEST_CONTROL: "Pest Control", GREASE_TRAP: "Grease Trap", HOOD_CLEANING: "Hood Cleaning",
  FIRE_SAFETY: "Fire Safety", HVAC: "HVAC / Air-con", EQUIPMENT: "Equipment Service",
  SANITATION: "Sanitation", LICENSE_PERMIT: "License / Permit", OTHER: "Other",
};
const INTERVAL_LABEL = {
  WEEKLY: "weekly", BIWEEKLY: "bi-weekly", MONTHLY: "monthly", BIMONTHLY: "every 8 weeks",
  QUARTERLY: "quarterly", SEMI_ANNUAL: "semi-annual", ANNUAL: "annual",
};
const INTERVAL_DAYS = { WEEKLY: 7, BIWEEKLY: 14, BIMONTHLY: 56 };
const INTERVAL_MONTHS = { MONTHLY: 1, QUARTERLY: 3, SEMI_ANNUAL: 6, ANNUAL: 12 };

function addDays(date, days) {
  const r = new Date(date); r.setUTCDate(r.getUTCDate() + days); return r;
}
function addMonths(date, months) {
  const r = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return r;
}
// Matches src/lib/labels.ts computeNextDue.
function computeNextDue(last, interval) {
  if (INTERVAL_DAYS[interval]) return addDays(last, INTERVAL_DAYS[interval]);
  return addMonths(last, INTERVAL_MONTHS[interval]);
}

// Each entry: { name, category, interval, vendor, last, next|null, notes|null, noDate? }
// next=null -> compute from last+interval (used when the sheet's Next was text/blank/invalid).
const BRANCHES = [
  {
    locName: "Park lawn",
    schedules: [
      { name: "CDN Linen", category: "OTHER", interval: "WEEKLY", vendor: "CDN Linen", last: d(2026,6,30), next: d(2026,7,7), notes: "Linen service." },
      { name: "Nella (Kitchen Equipment Service)", category: "EQUIPMENT", interval: "BIWEEKLY", vendor: "Nella", last: d(2026,6,17), next: d(2026,7,1), notes: "Frequency: Weekly / Bi-weekly." },
      { name: "Window Cleaning", category: "SANITATION", interval: "MONTHLY", vendor: "SEMO", last: d(2026,6,6), next: d(2026,7,5), notes: null },
      { name: "Hood Cleaning", category: "HOOD_CLEANING", interval: "BIWEEKLY", vendor: "Wizz", last: d(2026,7,2), next: d(2026,7,15), notes: null },
      { name: "Pest Control", category: "PEST_CONTROL", interval: "MONTHLY", vendor: "Seal Q", last: d(2026,6,18), next: null, notes: "Pending — waiting for uncle alan to confirm." },
      { name: "Grease Trap", category: "GREASE_TRAP", interval: "MONTHLY", vendor: "Rethink", last: d(2026,6,18), next: d(2026,7,2), notes: null },
      { name: "BC Chemicals (Dishwasher Maintenance)", category: "EQUIPMENT", interval: "MONTHLY", vendor: "BC Chemicals", last: d(2026,6,26), next: null, notes: "Dishwasher maintenance. Serviced bar + kitchen dishwashers; fixed kitchen dishwasher suction. -ares" },
      { name: "Craft & Draft (Beer Line Service)", category: "EQUIPMENT", interval: "BIMONTHLY", vendor: "Craft & Draft", last: d(2026,6,18), next: d(2026,8,13), notes: "Frequency: 8 weeks. Beer line service." },
      { name: "Used Oil", category: "OTHER", interval: "WEEKLY", vendor: "Green Oil", last: d(2026,6,29), next: null, notes: "Every Monday. Used-oil pickup." },
      { name: "Health Inspection", category: "LICENSE_PERMIT", interval: "ANNUAL", vendor: "City Health Dept", last: d(2025,4,14), next: null, notes: "Random schedule — next visit unscheduled." },
      { name: "Extensive Roof Cleaning", category: "SANITATION", interval: "SEMI_ANNUAL", vendor: "Mr. Oil Fighter (kugan guy)", last: d(2026,6,16), next: d(2026,10,1), notes: "Frequency: every 6 months. Roof cleaning." },
      { name: "Extensive Hood Cleaning", category: "HOOD_CLEANING", interval: "QUARTERLY", vendor: "Mr. Oil Fighter (kugan guy)", last: d(2026,6,16), next: null, notes: "Frequency: every 3 months (Kugan may switch to every 2 months per ram service guy - gwyneth)." },
    ],
  },
  {
    locName: "Liberty",
    schedules: [
      { name: "CDN Linen", category: "OTHER", interval: "WEEKLY", vendor: "CDN Linen", last: d(2026,6,29), next: d(2026,7,7), notes: "Linen service. Prices increased per driver; replacement fee to be removed on last invoice (Feb 24)." },
      { name: "Nella (Kitchen Equipment Service)", category: "EQUIPMENT", interval: "BIWEEKLY", vendor: "Nella", last: d(2026,6,29), next: d(2026,7,13), notes: "Frequency: Weekly / Bi-weekly." },
      { name: "Window Cleaning", category: "SANITATION", interval: "BIWEEKLY", vendor: "Four Season", last: d(2026,7,3), next: d(2026,7,16), notes: null },
      { name: "Hood Cleaning", category: "HOOD_CLEANING", interval: "QUARTERLY", vendor: "Mr. Oil Fighter", last: d(2026,4,14), next: d(2026,7,14), notes: "Frequency: every 3 months." },
      { name: "Pest Control", category: "PEST_CONTROL", interval: "MONTHLY", vendor: "Seal", last: d(2026,5,17), next: null, notes: "Sheet next: June." },
      { name: "Grease Trap", category: "GREASE_TRAP", interval: "MONTHLY", vendor: "Green Oil", last: d(2026,6,13), next: null, notes: "Sheet next: July." },
      { name: "BC Chemicals (Dishwasher Maintenance)", category: "EQUIPMENT", interval: "BIMONTHLY", vendor: "BC Chemicals", last: d(2026,2,28), next: null, notes: "Frequency: 6 weeks (mapped to 8-week cycle). Checked glasswasher noise; vendor found nothing but noise persists." },
      { name: "Craft & Draft (Beer Line Service)", category: "EQUIPMENT", interval: "BIMONTHLY", vendor: "Craft & Draft", last: d(2026,6,15), next: d(2026,7,27), notes: "Frequency: 6 weeks (mapped to 8-week cycle). Beer line service." },
      { name: "Filter Cleaning", category: "EQUIPMENT", interval: "BIWEEKLY", vendor: "Filter Wiz", last: d(2026,7,6), next: d(2026,7,20), notes: "Filter cleaning." },
      { name: "Health Inspection", category: "LICENSE_PERMIT", interval: "ANNUAL", vendor: "City Health Dept", last: d(2026,2,24), next: null, notes: "Random schedule — next visit unscheduled (after FIFA). Ensure toilet is rinsed and wiped thoroughly." },
      { name: "Cleaning Fridges in the Kitchen", category: "SANITATION", interval: "WEEKLY", vendor: "Kitchen Staff", last: d(2026,4,13), next: d(2026,4,20), notes: "Internal weekly kitchen-fridge cleaning." },
    ],
  },
  {
    locName: "Danforth",
    schedules: [
      { name: "CDN Linen", category: "OTHER", interval: "WEEKLY", vendor: "CDN Linen", last: d(2026,6,19), next: null, notes: "Linen service." },
      { name: "Nella (Kitchen Equipment Service)", category: "EQUIPMENT", interval: "BIWEEKLY", vendor: "Nella", last: d(2026,5,8), next: d(2026,5,22), notes: "Frequency: Weekly / Bi-weekly." },
      { name: "Window Cleaning", category: "SANITATION", interval: "BIWEEKLY", vendor: "Four Season", last: d(2026,5,18), next: d(2026,6,2), notes: null },
      { name: "Hood Cleaning", category: "HOOD_CLEANING", interval: "BIWEEKLY", vendor: "Roots", last: d(2026,4,26), next: null, notes: "Sheet next: Pending." },
      { name: "Filter Change", category: "EQUIPMENT", interval: "MONTHLY", vendor: null, last: d(2026,4,3), next: null, notes: "Filter change. Sheet next: Pending." },
      { name: "Pest Control", category: "PEST_CONTROL", interval: "MONTHLY", vendor: "Seal", last: d(2026,5,1), next: d(2026,6,2), notes: null },
      { name: "Grease Trap", category: "GREASE_TRAP", interval: "MONTHLY", vendor: "Green Oil", last: d(2026,6,15), next: null, notes: "Sheet next: Pending." },
      { name: "BC Chemicals (Dishwasher Maintenance)", category: "EQUIPMENT", interval: "MONTHLY", vendor: "BC Chemicals", last: d(2026,4,3), next: null, notes: "Dishwasher maintenance. Sheet next: Pending." },
      { name: "Craft & Draft (Beer Line Service)", category: "EQUIPMENT", interval: "BIMONTHLY", vendor: "Craft & Draft", last: d(2026,4,21), next: null, notes: "Frequency: 8 weeks. Beer line service. Sheet next: Pending." },
      { name: "Health Inspection", category: "LICENSE_PERMIT", interval: "ANNUAL", vendor: "City Health Dept", last: d(2026,6,19), next: null, notes: "Random schedule — next visit unscheduled." },
    ],
  },
  {
    locName: "Junction",
    schedules: [
      { name: "CDN Linen", category: "OTHER", interval: "WEEKLY", vendor: "CDN Linen", last: d(2026,6,23), next: d(2026,6,30), notes: "Linen service." },
      { name: "Nella (Kitchen Equipment Service)", category: "EQUIPMENT", interval: "BIWEEKLY", vendor: "Nella", last: d(2026,5,25), next: d(2026,6,2), notes: "Frequency: Weekly / Bi-weekly." },
      { name: "Window Cleaning", category: "SANITATION", interval: "BIWEEKLY", vendor: "Four Season", last: d(2026,6,17), next: d(2026,7,1), notes: null },
      { name: "Pest Control", category: "PEST_CONTROL", interval: "MONTHLY", vendor: "Seal", last: d(2026,6,18), next: d(2026,7,19), notes: null },
      { name: "Grease Trap", category: "GREASE_TRAP", interval: "MONTHLY", vendor: "Green Oil", last: d(2026,6,2), next: d(2026,7,2), notes: null },
      { name: "BC Chemicals (Dishwasher Maintenance)", category: "EQUIPMENT", interval: "MONTHLY", vendor: "BC Chemicals", last: d(2026,3,4), next: null, notes: "Dishwasher maintenance. Sheet next: Pending." },
      { name: "Craft & Draft (Beer Line Service)", category: "EQUIPMENT", interval: "BIMONTHLY", vendor: "Craft & Draft", last: d(2026,6,17), next: d(2026,8,18), notes: "Frequency: 8 weeks. Beer line service." },
      { name: "Extensive Hood Cleaning", category: "HOOD_CLEANING", interval: "QUARTERLY", vendor: "Estimate (TBD)", last: d(2026,6,23), next: d(2026,9,24), notes: "Frequency: every 3 months. Vendor estimate pending." },
      { name: "Health Inspection", category: "LICENSE_PERMIT", interval: "ANNUAL", vendor: "City Health Dept", last: d(2026,3,25), next: null, notes: "Random schedule — next visit unscheduled." },
      { name: "Filter Change", category: "EQUIPMENT", interval: "BIWEEKLY", vendor: "Filter Wizz", last: d(2026,5,22), next: d(2026,6,5), notes: "Filter change." },
      { name: "Republic Services (Garbage)", category: "SANITATION", interval: "WEEKLY", vendor: "Republic Services", last: d(2026,6,22), next: d(2026,6,24), notes: "Garbage pickup — Mon, Wed, Thu, Fri, Sat." },
    ],
  },
  {
    locName: "Mississauga",
    // Stale ~May 2025 setup sheet; everything unserviced. Rows with no sheet date
    // get a May-2025 placeholder anchor, flagged in notes.
    schedules: [
      { name: "CDN Linen", category: "OTHER", interval: "WEEKLY", vendor: "CDN Linen", last: d(2025,5,22), next: d(2025,5,29), notes: "Linen service." },
      { name: "Nella (Kitchen Equipment Service)", category: "EQUIPMENT", interval: "BIWEEKLY", vendor: "Nella", last: d(2025,5,20), next: d(2025,5,27), notes: "Frequency: Weekly / Bi-weekly." },
      { name: "Window Cleaning", category: "SANITATION", interval: "BIWEEKLY", vendor: "Four Season", last: d(2025,5,1), next: null, notes: "⚠ No service date in source sheet (May 2025) — placeholder anchor, needs verification.", noDate: true },
      { name: "Hood Cleaning", category: "HOOD_CLEANING", interval: "BIWEEKLY", vendor: "Aspro", last: d(2025,5,1), next: null, notes: "⚠ No service date in source sheet (May 2025) — placeholder anchor, needs verification.", noDate: true },
      { name: "Pest Control", category: "PEST_CONTROL", interval: "MONTHLY", vendor: "Seal", last: d(2025,5,24), next: d(2025,6,21), notes: "1st visit." },
      { name: "Grease Trap", category: "GREASE_TRAP", interval: "MONTHLY", vendor: "Green Oil", last: d(2025,5,7), next: d(2025,6,4), notes: null },
      { name: "BC Chemicals (Dishwasher Maintenance)", category: "EQUIPMENT", interval: "MONTHLY", vendor: "BC Chemicals", last: d(2025,5,1), next: null, notes: "⚠ No service date in source sheet (May 2025) — placeholder anchor, needs verification.", noDate: true },
      { name: "Craft & Draft (Beer Line Service)", category: "EQUIPMENT", interval: "BIMONTHLY", vendor: "Craft & Draft", last: d(2025,5,1), next: null, notes: "⚠ No service date in source sheet (May 2025) — placeholder anchor, needs verification. Frequency: 8 weeks.", noDate: true },
      { name: "Extensive Hood Cleaning", category: "HOOD_CLEANING", interval: "QUARTERLY", vendor: "Roots", last: d(2025,5,1), next: null, notes: "⚠ No service date in source sheet (May 2025) — placeholder anchor, needs verification. Frequency: every 3 months.", noDate: true },
      { name: "Health Inspection", category: "LICENSE_PERMIT", interval: "ANNUAL", vendor: "City Health Dept", last: d(2025,5,1), next: null, notes: "⚠ No service date in source sheet (May 2025) — placeholder anchor. Random schedule — next visit unscheduled.", noDate: true },
    ],
  },
  {
    locName: "Imm Thai",
    createIfMissing: true,
    // Stale ~Jan–Mar 2025 sheet.
    schedules: [
      { name: "CDN Linen", category: "OTHER", interval: "WEEKLY", vendor: "CDN Linen", last: d(2025,2,18), next: d(2025,2,25), notes: "Linen service." },
      { name: "Nella (Kitchen Equipment Service)", category: "EQUIPMENT", interval: "BIWEEKLY", vendor: "Nella", last: d(2025,2,12), next: d(2025,2,26), notes: "Frequency: Weekly / Bi-weekly." },
      { name: "Window Cleaning", category: "SANITATION", interval: "BIWEEKLY", vendor: "Four Season", last: d(2025,1,1), next: null, notes: "⚠ No service date in source sheet (early 2025) — placeholder anchor, needs verification.", noDate: true },
      { name: "Hood Cleaning", category: "HOOD_CLEANING", interval: "BIWEEKLY", vendor: "Aspro", last: d(2025,2,10), next: d(2025,2,24), notes: null },
      { name: "Pest Control", category: "PEST_CONTROL", interval: "MONTHLY", vendor: "Seal", last: d(2025,2,9), next: d(2025,3,9), notes: null },
      { name: "Grease Trap", category: "GREASE_TRAP", interval: "MONTHLY", vendor: "Green Oil", last: d(2025,1,23), next: d(2025,2,23), notes: "On request." },
      { name: "BC Chemicals (Dishwasher Maintenance)", category: "EQUIPMENT", interval: "MONTHLY", vendor: "BC Chemicals", last: d(2025,1,17), next: d(2025,2,24), notes: "Dishwasher maintenance." },
      { name: "Craft & Draft (Beer Line Service)", category: "EQUIPMENT", interval: "BIMONTHLY", vendor: "Craft & Draft", last: d(2025,1,15), next: d(2025,3,12), notes: "Frequency: 8 weeks. Beer line service." },
      { name: "Extensive Hood Cleaning", category: "HOOD_CLEANING", interval: "QUARTERLY", vendor: "Roots", last: d(2025,1,5), next: d(2025,4,5), notes: "On request. Frequency: every 3 months." },
      { name: "Health Inspection", category: "LICENSE_PERMIT", interval: "ANNUAL", vendor: "City Health Dept", last: d(2025,3,4), next: null, notes: "Random schedule — next visit unscheduled." },
    ],
  },
];

function describe(s) {
  const parts = [`Recurring ${INTERVAL_LABEL[s.interval]} compliance service.`, `Last serviced: ${s.last.toISOString().slice(0,10)}.`];
  if (s.vendor) parts.push(`Vendor: ${s.vendor}.`);
  return parts.join(" ");
}

async function resolveLocation(branch) {
  let loc = await p.location.findFirst({ where: { name: branch.locName }, select: { id: true, name: true } });
  if (!loc && branch.createIfMissing) {
    loc = await p.location.create({ data: { name: branch.locName, region: "Toronto" }, select: { id: true, name: true } });
    console.log(`Created location: ${loc.name} (${loc.id})`);
  }
  return loc;
}

async function main() {
  let created = 0, skipped = 0;
  for (const branch of BRANCHES) {
    const loc = await resolveLocation(branch);
    if (!loc) { console.log(`!! Location not found, skipping branch: ${branch.locName}`); continue; }
    console.log(`\n=== ${loc.name} (${loc.id}) ===`);

    for (const s of branch.schedules) {
      const exists = await p.complianceSchedule.findFirst({ where: { name: s.name, locationId: loc.id } });
      if (exists) { console.log("  SKIP (exists):", s.name); skipped++; continue; }

      const nextDue = s.next ?? computeNextDue(s.last, s.interval);

      await p.$transaction(async (tx) => {
        const schedule = await tx.complianceSchedule.create({
          data: {
            name: s.name, category: s.category, interval: s.interval, locationId: loc.id,
            assigneeId: null, vendor: s.vendor, priority: "HIGH", notes: s.notes,
            lastServiceDate: s.last, nextDueDate: nextDue, createdById: ADMIN_ID,
          },
        });
        const task = await tx.task.create({
          data: {
            title: `[${CATEGORY_LABEL[s.category]}] ${s.name}`, description: describe(s),
            type: "RECURRING", priority: "HIGH", locationId: loc.id, assignerId: ADMIN_ID,
            assigneeId: null, department: "Compliance", complianceScheduleId: schedule.id,
            dueAt: nextDue, proofRequired: false,
          },
        });
        await tx.complianceSchedule.update({ where: { id: schedule.id }, data: { currentTaskId: task.id } });
        await tx.activityLog.create({
          data: {
            userId: ADMIN_ID, action: "compliance.created", entity: "ComplianceSchedule",
            entityId: schedule.id, locationId: loc.id,
            meta: { name: schedule.name, category: schedule.category, nextDueDate: nextDue.toISOString() },
          },
        });
      });
      console.log(`  Created: ${s.name} (${s.interval}, last ${s.last.toISOString().slice(0,10)} -> next ${nextDue.toISOString().slice(0,10)})${s.noDate ? " [placeholder date]" : ""}`);
      created++;
    }
  }
  console.log(`\nDONE. Created ${created}, skipped ${skipped}.`);
  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
