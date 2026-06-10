"use server";

import { revalidatePath } from "next/cache";
import { Priority, TaskStatus, TaskType } from "@prisma/client";
import { prisma } from "./prisma";
import { logActivity } from "./activity";
import { createNotification } from "./notifications";
import { getCurrentUser, isManager, scopedLocationIds } from "./auth";

// Allowed status transitions (server-enforced). OVERDUE is derived, not a manual target.
const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  PENDING: ["IN_PROGRESS", "DONE"],
  IN_PROGRESS: ["DONE", "PENDING"],
  DONE: ["VERIFIED", "IN_PROGRESS"], // verify, or reopen/reject
  VERIFIED: [], // terminal
  OVERDUE: ["IN_PROGRESS", "DONE"],
};

export type ActionResult = { ok: true } | { ok: false; error: string };

async function assertInScope(locationId: string) {
  const user = await getCurrentUser();
  if (!user) return { user: null, error: "Not signed in" as const };
  const ids = await scopedLocationIds(user);
  if (ids !== null && !ids.includes(locationId)) {
    return { user, error: "Outside your location scope" as const };
  }
  return { user, error: null };
}

export async function createTask(input: {
  title: string;
  description?: string;
  type: TaskType;
  priority: Priority;
  locationId: string;
  assigneeId?: string;
  department?: string;
  dueAt?: string; // ISO
  proofRequired: boolean;
}): Promise<ActionResult> {
  const { user, error } = await assertInScope(input.locationId);
  if (!user) return { ok: false, error: error ?? "Not signed in" };
  if (error) return { ok: false, error };
  if (!isManager(user.role) && user.role !== "SHIFT_LEAD") {
    return { ok: false, error: "Only managers/shift leads can create tasks" };
  }
  if (!input.title.trim()) return { ok: false, error: "Title is required" };

  await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        type: input.type,
        priority: input.priority,
        locationId: input.locationId,
        assigneeId: input.assigneeId || null,
        assignerId: user.id,
        department: input.department?.trim() || null,
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

    // Notify the assignee.
    if (input.assigneeId && input.assigneeId !== user.id) {
      await createNotification(tx, {
        userId: input.assigneeId,
        type: "TASK_ASSIGNED",
        title: "New task assigned to you",
        body: `"${task.title}" — due ${task.dueAt ? task.dueAt.toLocaleDateString() : "no date"}.`,
        entityId: task.id,
        entityType: "Task",
      });
    }
  });

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
  if (scope !== null && !scope.includes(task.locationId)) {
    return { ok: false, error: "Outside your location scope" };
  }

  // Effective current status: surface OVERDUE for validation if past due.
  const effective: TaskStatus =
    task.dueAt &&
    task.dueAt.getTime() < Date.now() &&
    task.status !== "DONE" &&
    task.status !== "VERIFIED"
      ? "OVERDUE"
      : task.status;

  if (!TRANSITIONS[effective].includes(next)) {
    return { ok: false, error: `Cannot move from ${effective} to ${next}` };
  }

  if (next === "VERIFIED" && !isManager(user.role)) {
    return { ok: false, error: "Only managers can verify tasks" };
  }

  const cleanPhotos = (photoUrls ?? []).map((u) => u.trim()).filter(Boolean);
  if (next === "DONE" && task.proofRequired && cleanPhotos.length === 0) {
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

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return { ok: true };
}
