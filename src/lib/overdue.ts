import { prisma } from "./prisma";
import { logActivity } from "./activity";
import { createNotification } from "./notifications";
import { sendPushToUser } from "./push";
import { getNotificationSettings } from "./settings";

/**
 * Marks past-due active tasks as OVERDUE, escalates to the location manager,
 * notifies the assignee, and sends near-due reminders once each. The near-due
 * lead time is configurable in Settings → Notifications. Push mirrors each
 * in-app notification (when push is enabled). Safe to run repeatedly.
 */
export async function runOverdueChecks(now: Date = new Date()): Promise<{
  marked: number;
  escalated: number;
  nearDueNotified: number;
}> {
  const settings = await getNotificationSettings();
  const push = settings.pushEnabled;

  const overdueNow = await prisma.task.findMany({
    where: {
      dueAt: { lt: now },
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
    include: {
      location: { select: { id: true, name: true, managerId: true } },
      assignee: { select: { id: true, name: true } },
    },
  });

  let marked = 0;
  let escalated = 0;

  for (const task of overdueNow) {
    const managerId = task.location.managerId;
    const escalate = !!(managerId && managerId !== task.assigneeId);

    await prisma.$transaction(async (tx) => {
      await tx.task.update({ where: { id: task.id }, data: { status: "OVERDUE" } });

      await logActivity(tx, {
        userId: task.assignerId ?? task.location.managerId ?? task.id,
        action: "task.overdue",
        entity: "Task",
        entityId: task.id,
        locationId: task.locationId,
        meta: { title: task.title, dueAt: task.dueAt },
      });

      if (escalate && managerId) {
        await createNotification(tx, {
          userId: managerId,
          type: "ESCALATION",
          title: `Task overdue: ${task.title}`,
          body: `"${task.title}" at ${task.location.name} passed its deadline${task.assignee ? ` (assigned to ${task.assignee.name})` : ""}.`,
          entityId: task.id,
          entityType: "Task",
        });
        escalated++;
      }

      if (task.assigneeId) {
        await createNotification(tx, {
          userId: task.assigneeId,
          type: "TASK_OVERDUE",
          title: `Your task is overdue`,
          body: `"${task.title}" at ${task.location.name} is past its due date.`,
          entityId: task.id,
          entityType: "Task",
        });
      }
    });

    if (push && escalate && managerId) {
      void sendPushToUser(managerId, {
        title: `Task overdue: ${task.title}`,
        body: `${task.location.name}${task.assignee ? ` · ${task.assignee.name}` : ""} — past deadline.`,
        url: `/tasks/${task.id}`,
        tag: `task-${task.id}`,
      });
    }
    if (push && task.assigneeId) {
      void sendPushToUser(task.assigneeId, {
        title: "Your task is overdue",
        body: `"${task.title}" at ${task.location.name} is past its due date.`,
        url: `/tasks/${task.id}`,
        tag: `task-${task.id}`,
      });
    }
    marked++;
  }

  // Near-due: tasks due within the configured lead time, still active, no prior
  // near-due notification. Skipped entirely when the reminder is turned off.
  let nearDueNotified = 0;
  if (settings.nearDueEnabled) {
    const leadMs = settings.nearDueHours * 60 * 60 * 1000;
    const horizon = new Date(now.getTime() + leadMs);
    const nearDue = await prisma.task.findMany({
      where: {
        dueAt: { gt: now, lte: horizon },
        status: { in: ["PENDING", "IN_PROGRESS"] },
        assigneeId: { not: null },
      },
      include: { location: { select: { name: true } } },
    });

    const hoursLabel = settings.nearDueHours === 1 ? "1 hour" : `${settings.nearDueHours} hours`;
    for (const task of nearDue) {
      if (!task.assigneeId) continue;
      const existing = await prisma.notification.findFirst({
        where: { userId: task.assigneeId, type: "TASK_NEAR_DUE", entityId: task.id },
      });
      if (existing) continue;

      await createNotification(prisma, {
        userId: task.assigneeId,
        type: "TASK_NEAR_DUE",
        title: `Task due soon`,
        body: `"${task.title}" at ${task.location.name} is due within ${hoursLabel}.`,
        entityId: task.id,
        entityType: "Task",
      });
      if (push) {
        void sendPushToUser(task.assigneeId, {
          title: "Task due soon",
          body: `"${task.title}" at ${task.location.name} is due within ${hoursLabel}.`,
          url: `/tasks/${task.id}`,
          tag: `task-${task.id}`,
        });
      }
      nearDueNotified++;
    }
  }

  return { marked, escalated, nearDueNotified };
}
