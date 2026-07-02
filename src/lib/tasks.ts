"use server";

import { revalidatePath } from "next/cache";
import { Priority, TaskStatus, TaskType } from "@prisma/client";
import { prisma } from "./prisma";
import { logActivity } from "./activity";
import { createNotification } from "./notifications";
import { sendPushToUser } from "./push";
import { getCurrentUser, isManager, scopedLocationIds } from "./auth";
import { canTransition, canVerify, deriveStatus, proofMissing } from "./rules";
import { rollScheduleOnTaskDone } from "./compliance";
import { formatDateTime } from "./labels";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createTask(input: {
  title: string;
  description?: string;
  type: TaskType;
  priority: Priority;
  locationId: string;
  assigneeId?: string;
  department?: string;
  categoryId?: string;
  startAt?: string; // ISO — optional future start date
  dueAt?: string; // ISO
  proofRequired: boolean;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!input.title.trim()) return { ok: false, error: "Title is required" };

  const canManage = isManager(user.role) || user.role === "SHIFT_LEAD";

  // Non-managers may only create personal tasks: assigned to themselves, at their own branch.
  let locationId = input.locationId;
  let assigneeId: string | null = input.assigneeId || null;
  if (!canManage) {
    if (!user.locationId) return { ok: false, error: "You have no branch assigned — ask a manager" };
    locationId = user.locationId;
    assigneeId = user.id;
  } else {
    const ids = await scopedLocationIds(user);
    if (ids !== null && !ids.includes(locationId)) {
      return { ok: false, error: "Outside your location scope" };
    }
  }

  let newTaskId = "";
  const dueText = input.dueAt ? formatDateTime(new Date(input.dueAt)) : "no date";
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        type: input.type,
        priority: input.priority,
        locationId,
        assigneeId,
        assignerId: user.id,
        department: input.department?.trim() || null,
        categoryId: input.categoryId || null,
        startAt: input.startAt ? new Date(input.startAt) : null,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        proofRequired: input.proofRequired,
      },
    });
    await logActivity(tx, {
      userId: user.id,
      action: "task.created",
      entity: "Task",
      entityId: task.id,
      locationId: task.locationId,
      meta: { title: task.title, assigneeId: task.assigneeId, priority: task.priority },
    });

    newTaskId = task.id;

    // Notify the assignee (skips self-assigned personal tasks).
    if (assigneeId && assigneeId !== user.id) {
      await createNotification(tx, {
        userId: assigneeId,
        type: "TASK_ASSIGNED",
        title: "New task assigned to you",
        body: `"${task.title}" — due ${task.dueAt ? formatDateTime(task.dueAt) : "no date"}.`,
        entityId: task.id,
        entityType: "Task",
      });
    }
  });

  // Real-time push (after commit, fire-and-forget).
  if (assigneeId && assigneeId !== user.id && newTaskId) {
    void sendPushToUser(assigneeId, {
      title: "New task assigned to you",
      body: `"${input.title.trim()}" — due ${dueText}.`,
      url: `/tasks/${newTaskId}`,
      tag: `task-${newTaskId}`,
      category: "tasks",
    });
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function changeTaskStatus(
  taskId: string,
  next: TaskStatus,
  photoUrls?: string[],
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "Task not found" };

  const scope = await scopedLocationIds(user);
  // Allow assignees to update their own tasks even if cross-location.
  const isAssignee = task.assigneeId === user.id;
  if (scope !== null && !scope.includes(task.locationId) && !isAssignee) {
    return { ok: false, error: "Outside your location scope" };
  }

  // Effective current status: surface OVERDUE for validation if past due.
  const effective = deriveStatus(task.status, task.dueAt);

  if (!canTransition(effective, next)) {
    return { ok: false, error: `Cannot move from ${effective} to ${next}` };
  }

  if (next === "VERIFIED" && !canVerify(user.role)) {
    return { ok: false, error: "Only managers can verify tasks" };
  }

  const cleanPhotos = (photoUrls ?? []).map((u) => u.trim()).filter(Boolean);
  if (proofMissing(next, task.proofRequired, cleanPhotos.length)) {
    return { ok: false, error: "Photo proof is required to complete this task" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.update({ where: { id: task.id }, data: { status: next } });

    if (next === "DONE") {
      await tx.taskCompletion.create({
        data: {
          taskId: task.id,
          completedById: user.id,
          photoUrls: cleanPhotos,
          locationStamp: task.locationId,
        },
      });
    }
    if (next === "VERIFIED") {
      // Stamp the latest completion as verified, if present.
      const latest = await tx.taskCompletion.findFirst({
        where: { taskId: task.id },
        orderBy: { completedAt: "desc" },
      });
      if (latest) {
        await tx.taskCompletion.update({
          where: { id: latest.id },
          data: { verifiedById: user.id, verifiedAt: new Date() },
        });
      }
    }

    await logActivity(tx, {
      userId: user.id,
      action: next === "VERIFIED" ? "task.verified" : "task.status_changed",
      entity: "Task",
      entityId: task.id,
      locationId: task.locationId,
      meta: { from: task.status, to: next, title: task.title, photos: cleanPhotos.length },
    });
  });

  // If this task is the open cycle of a compliance schedule, roll it forward.
  if ((next === "DONE" || next === "VERIFIED") && task.complianceScheduleId) {
    await rollScheduleOnTaskDone(task.id, new Date(), user.id);
  }

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function assignTask(taskId: string, assigneeId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role) && user.role !== "SHIFT_LEAD") {
    return { ok: false, error: "Only managers/shift leads can assign tasks" };
  }
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "Task not found" };

  const scope = await scopedLocationIds(user);
  if (scope !== null && !scope.includes(task.locationId)) {
    return { ok: false, error: "Outside your location scope" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.update({ where: { id: task.id }, data: { assigneeId } });
    await logActivity(tx, {
      userId: user.id,
      action: "task.assigned",
      entity: "Task",
      entityId: task.id,
      locationId: task.locationId,
      meta: { from: task.assigneeId, to: assigneeId },
    });

    // Notify new assignee.
    if (assigneeId !== user.id) {
      await createNotification(tx, {
        userId: assigneeId,
        type: "TASK_ASSIGNED",
        title: "Task assigned to you",
        body: `"${task.title}" has been assigned to you.`,
        entityId: task.id,
        entityType: "Task",
      });
    }
  });

  if (assigneeId !== user.id) {
    void sendPushToUser(assigneeId, {
      title: "Task assigned to you",
      body: `"${task.title}" has been assigned to you.`,
      url: `/tasks/${taskId}`,
      tag: `task-${taskId}`,
      category: "tasks",
    });
  }

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/board");
  return { ok: true };
}

/** Board: add a task into a category with just a title (managers/shift leads). */
export async function quickAddTask(categoryId: string, title: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role) && user.role !== "SHIFT_LEAD") {
    return { ok: false, error: "Only managers/shift leads can create tasks" };
  }
  if (!title.trim()) return { ok: false, error: "Title is required" };

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return { ok: false, error: "Category not found" };

  // Resolve a location: category scope → user's location → first location.
  let locationId = category.locationId ?? user.locationId ?? null;
  if (!locationId) {
    const loc = await prisma.location.findFirst({ orderBy: { createdAt: "asc" } });
    if (!loc) return { ok: false, error: "No location available" };
    locationId = loc.id;
  }
  const ids = await scopedLocationIds(user);
  if (ids !== null && !ids.includes(locationId)) {
    return { ok: false, error: "Outside your location scope" };
  }

  const count = await prisma.task.count({ where: { categoryId } });
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        title: title.trim(),
        type: "ONE_OFF",
        priority: "MEDIUM",
        locationId: locationId as string,
        assignerId: user.id,
        categoryId,
        position: count,
        proofRequired: false,
      },
    });
    await logActivity(tx, {
      userId: user.id,
      action: "task.created",
      entity: "Task",
      entityId: task.id,
      locationId: locationId as string,
      meta: { title: task.title, categoryId },
    });
  });

  revalidatePath("/board");
  return { ok: true };
}

export async function editTask(input: {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  assigneeId?: string;
  categoryId?: string;
  department?: string;
  startAt?: string | null;
  dueAt?: string | null;
  proofRequired: boolean;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role) && user.role !== "SHIFT_LEAD") {
    return { ok: false, error: "Only managers/shift leads can edit tasks" };
  }
  if (!input.title.trim()) return { ok: false, error: "Title is required" };

  const task = await prisma.task.findUnique({ where: { id: input.id } });
  if (!task) return { ok: false, error: "Task not found" };

  const scope = await scopedLocationIds(user);
  if (scope !== null && !scope.includes(task.locationId)) {
    return { ok: false, error: "Outside your location scope" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: input.id },
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        priority: input.priority,
        assigneeId: input.assigneeId || null,
        categoryId: input.categoryId || null,
        department: input.department?.trim() || null,
        startAt: input.startAt ? new Date(input.startAt) : null,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        proofRequired: input.proofRequired,
      },
    });
    await logActivity(tx, {
      userId: user.id,
      action: "task.edited",
      entity: "Task",
      entityId: input.id,
      locationId: task.locationId,
      meta: { title: input.title.trim() },
    });
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${input.id}`);
  revalidatePath("/board");
  return { ok: true };
}

/** Permanently delete a task (and its completions, comments, attachments via cascade). Managers only. */
export async function deleteTask(taskId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role)) {
    return { ok: false, error: "Only managers can delete tasks" };
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "Task not found" };

  const scope = await scopedLocationIds(user);
  if (scope !== null && !scope.includes(task.locationId)) {
    return { ok: false, error: "Outside your location scope" };
  }

  await prisma.$transaction(async (tx) => {
    // Log before deletion — entityId is a plain string, no FK to the row.
    await logActivity(tx, {
      userId: user.id,
      action: "task.deleted",
      entity: "Task",
      entityId: taskId,
      locationId: task.locationId,
      meta: { title: task.title },
    });
    await tx.task.delete({ where: { id: taskId } });
  });

  revalidatePath("/tasks");
  revalidatePath("/board");
  return { ok: true };
}

/** Apply one action (status / assign / delete) to many tasks at once. Managers only. */
export async function bulkTaskAction(input: {
  ids: string[];
  action: "status" | "assign" | "delete" | "archive" | "unarchive";
  status?: TaskStatus;
  assigneeId?: string | null;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role)) return { ok: false, error: "Managers only" };
  if (input.ids.length === 0) return { ok: false, error: "No tasks selected" };

  const scope = await scopedLocationIds(user);
  const tasks = await prisma.task.findMany({
    where: { id: { in: input.ids }, ...(scope ? { locationId: { in: scope } } : {}) },
  });
  if (tasks.length === 0) return { ok: false, error: "No tasks in scope" };

  await prisma.$transaction(async (tx) => {
    for (const t of tasks) {
      if (input.action === "delete") {
        await logActivity(tx, {
          userId: user.id, action: "task.deleted", entity: "Task", entityId: t.id,
          locationId: t.locationId, meta: { title: t.title, bulk: true },
        });
        await tx.task.delete({ where: { id: t.id } });
      } else if (input.action === "assign") {
        await tx.task.update({ where: { id: t.id }, data: { assigneeId: input.assigneeId ?? null } });
        await logActivity(tx, {
          userId: user.id, action: "task.assigned", entity: "Task", entityId: t.id,
          locationId: t.locationId, meta: { assigneeId: input.assigneeId ?? null, bulk: true },
        });
      } else if (input.action === "status" && input.status) {
        await tx.task.update({ where: { id: t.id }, data: { status: input.status } });
        await logActivity(tx, {
          userId: user.id, action: "task.status_changed", entity: "Task", entityId: t.id,
          locationId: t.locationId, meta: { from: t.status, to: input.status, bulk: true },
        });
      } else if (input.action === "archive") {
        await tx.task.update({ where: { id: t.id }, data: { archived: true, archivedAt: new Date() } });
        await logActivity(tx, {
          userId: user.id, action: "task.archived", entity: "Task", entityId: t.id,
          locationId: t.locationId, meta: { title: t.title, bulk: true },
        });
      } else if (input.action === "unarchive") {
        await tx.task.update({ where: { id: t.id }, data: { archived: false, archivedAt: null } });
        await logActivity(tx, {
          userId: user.id, action: "task.unarchived", entity: "Task", entityId: t.id,
          locationId: t.locationId, meta: { title: t.title, bulk: true },
        });
      }
    }
  });

  revalidatePath("/tasks");
  revalidatePath("/board");
  return { ok: true };
}

// Attributes the cron's bulk-archive summary log entry — ActivityLog.userId is a
// required FK, so the sweep can't log as a synthetic "system" user. Reuses the same
// id as the audit-logs page / login report (src/app/audit-logs/page.tsx, src/lib/login-report.ts).
const SUJEE_ID = "cmq92qov50001jo04684n5q3c";

/**
 * Cron sweep: archives two kinds of stale tasks. Soft-archive only (never deletes) —
 * completion/attachment/comment history stays intact, just hidden from the default
 * task views.
 *  - DONE/VERIFIED tasks not touched in `days` days (default 30). Uses `updatedAt` as
 *    a proxy for completion recency since DONE/VERIFIED is normally the last edit.
 *  - OVERDUE/PENDING tasks that have sat open for `openDays` days (default 15) —
 *    "age" is the due date for tasks that have one (how long it's been overdue), or
 *    `createdAt` for the rare PENDING task with no due date at all.
 */
export async function archiveOldTasks(
  now: Date = new Date(),
  days = 30,
  openDays = 15,
): Promise<{ archived: number; archivedCompleted: number; archivedOpen: number }> {
  const cutoff = new Date(now.getTime() - days * 86400000);
  const completed = await prisma.task.updateMany({
    where: { archived: false, status: { in: ["DONE", "VERIFIED"] }, updatedAt: { lt: cutoff } },
    data: { archived: true, archivedAt: now },
  });

  const openCutoff = new Date(now.getTime() - openDays * 86400000);
  const open = await prisma.task.updateMany({
    where: {
      archived: false,
      status: { in: ["OVERDUE", "PENDING"] },
      OR: [{ dueAt: { lt: openCutoff } }, { dueAt: null, createdAt: { lt: openCutoff } }],
    },
    data: { archived: true, archivedAt: now },
  });

  const total = completed.count + open.count;
  if (total > 0) {
    await logActivity(prisma, {
      userId: SUJEE_ID,
      action: "task.bulk_archived",
      entity: "Task",
      entityId: "bulk",
      meta: { count: total, completedCount: completed.count, openCount: open.count, days, openDays },
    });
  }

  return { archived: total, archivedCompleted: completed.count, archivedOpen: open.count };
}

/** Board: set or clear a task's due date. */
export async function setTaskDue(taskId: string, dueAt: string | null): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role) && user.role !== "SHIFT_LEAD") {
    return { ok: false, error: "Only managers/shift leads can change due dates" };
  }
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "Task not found" };
  const scope = await scopedLocationIds(user);
  if (scope !== null && !scope.includes(task.locationId)) {
    return { ok: false, error: "Outside your location scope" };
  }

  const next = dueAt ? new Date(dueAt) : null;
  await prisma.$transaction(async (tx) => {
    await tx.task.update({ where: { id: taskId }, data: { dueAt: next } });
    await logActivity(tx, {
      userId: user.id,
      action: "task.due_changed",
      entity: "Task",
      entityId: taskId,
      locationId: task.locationId,
      meta: { from: task.dueAt, to: next, title: task.title },
    });
  });

  revalidatePath("/board");
  revalidatePath("/tasks");
  return { ok: true };
}
