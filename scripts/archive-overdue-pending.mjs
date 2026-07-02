// One-off, additive cleanup — archives every non-archived OVERDUE/PENDING task
// company-wide, regardless of age (explicitly requested; the normal 30-day
// DONE/VERIFIED cron sweep doesn't touch open work and these were all <30 days
// old anyway). Soft-archive only — no rows deleted, fully restorable via
// /tasks?archived=1. Logs ONE summary ActivityLog row (per-task logging would
// flood the log for a 600-row sweep), same convention as archiveOldTasks() in
// src/lib/tasks.ts.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SUJEE_ID = "cmq92qov50001jo04684n5q3c";

async function main() {
  const before = await prisma.task.groupBy({
    by: ["status"],
    where: { archived: false, status: { in: ["PENDING", "OVERDUE"] } },
    _count: true,
  });
  console.log("Before:", before);

  const result = await prisma.task.updateMany({
    where: { archived: false, status: { in: ["PENDING", "OVERDUE"] } },
    data: { archived: true, archivedAt: new Date() },
  });
  console.log(`Archived ${result.count} tasks.`);

  if (result.count > 0) {
    await prisma.activityLog.create({
      data: {
        userId: SUJEE_ID,
        action: "task.bulk_archived",
        entity: "Task",
        entityId: "bulk",
        meta: { count: result.count, reason: "manual cleanup — all OVERDUE/PENDING, requested by Sujee" },
      },
    });
  }

  const remaining = await prisma.task.count({ where: { archived: false } });
  console.log("Non-archived tasks remaining:", remaining);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
