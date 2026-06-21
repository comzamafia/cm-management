import { prisma } from "./prisma";
import { createNotification } from "./notifications";
import { sendPushToUser } from "./push";
import { getNotificationSettings } from "./settings";
import { dayBoundsTZ } from "./time";

/**
 * Notify assignees of tasks whose future start date has arrived (today, local time).
 * Fires once per task (guarded by startNotified). Run daily from the cron.
 */
export async function runStartingToday(now: Date = new Date()): Promise<{ notified: number }> {
  const push = (await getNotificationSettings()).pushEnabled;
  const { end } = dayBoundsTZ(now);

  // Tasks with a start date on/before end-of-today, not yet announced, still open.
  const starting = await prisma.task.findMany({
    where: {
      startAt: { not: null, lte: end },
      startNotified: false,
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
    include: { location: { select: { name: true } } },
  });

  let notified = 0;
  for (const t of starting) {
    await prisma.$transaction(async (tx) => {
      await tx.task.update({ where: { id: t.id }, data: { startNotified: true } });
      if (t.assigneeId) {
        await createNotification(tx, {
          userId: t.assigneeId,
          type: "TASK_STARTING",
          title: "A scheduled task starts today",
          body: `"${t.title}" at ${t.location.name} is scheduled to start today.`,
          entityId: t.id,
          entityType: "Task",
        });
      }
    });
    if (t.assigneeId) {
      if (push) {
        void sendPushToUser(t.assigneeId, {
          title: "A scheduled task starts today",
          body: `"${t.title}" at ${t.location.name} is scheduled to start today.`,
          url: `/tasks/${t.id}`,
          tag: `task-${t.id}`,
        });
      }
      notified++;
    }
  }

  return { notified };
}
