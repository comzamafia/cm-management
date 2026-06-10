import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notifications";

// GET /api/cron/check-overdue
// Call hourly (or on-demand). Handles two jobs:
//   1. Mark tasks as OVERDUE when dueAt has passed and status is still active.
//   2. Send escalation notifications (once per task) to the location manager.

export async function GET() {
  const now = new Date();

  // Tasks that have passed their due date but aren't closed or already OVERDUE.
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

      // Escalate: notify the location manager.
      const managerId = task.location.managerId;
      if (managerId && managerId !== task.assigneeId) {
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

      // Also notify the assignee.
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
    marked++;
  }

  // Near-due: tasks due in the next 2 hours, still active, no prior near-due notification.
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const nearDue = await prisma.task.findMany({
    where: {
      dueAt: { gt: now, lte: twoHoursFromNow },
      status: { in: ["PENDING", "IN_PROGRESS"] },
      assigneeId: { not: null },
    },
    include: { location: { select: { name: true } } },
  });

  let nearDueNotified = 0;
  for (const task of nearDue) {
    if (!task.assigneeId) continue;
    // Only notify once: skip if a TASK_NEAR_DUE notification already exists for this task.
    const existing = await prisma.notification.findFirst({
      where: { userId: task.assigneeId, type: "TASK_NEAR_DUE", entityId: task.id },
    });
    if (existing) continue;

    await createNotification(prisma, {
      userId: task.assigneeId,
      type: "TASK_NEAR_DUE",
      title: `Task due soon`,
      body: `"${task.title}" at ${task.location.name} is due within 2 hours.`,
      entityId: task.id,
      entityType: "Task",
    });
    nearDueNotified++;
  }

  return NextResponse.json({ ok: true, marked, escalated, nearDueNotified });
}
