"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { getCurrentUser, atLeast, scopedLocationIds } from "./auth";

export type ActionResult = { ok: boolean; error?: string };

/** Toggling a subtask is allowed for the assignee or any shift-lead+ in scope. */
async function loadTaskForUser(taskId: string, requireManage: boolean) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" as const };
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, locationId: true, assigneeId: true },
  });
  if (!task) return { error: "Task not found" as const };

  const scope = await scopedLocationIds(user);
  if (scope !== null && !scope.includes(task.locationId)) return { error: "Out of scope" as const };

  const isManager = atLeast(user.role, Role.SHIFT_LEAD);
  if (requireManage && !isManager) return { error: "Shift leads and managers only" as const };
  if (!requireManage && !isManager && task.assigneeId !== user.id) {
    return { error: "Only the assignee or a manager can update this" as const };
  }
  return { user, task };
}

export async function addSubtask(taskId: string, title: string): Promise<ActionResult> {
  if (!title.trim()) return { ok: false, error: "Title is required" };
  const ctx = await loadTaskForUser(taskId, true);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const count = await prisma.subtask.count({ where: { taskId } });
  await prisma.subtask.create({
    data: { taskId, title: title.trim(), position: count },
  });
  revalidatePath(`/tasks/${taskId}`);
  return { ok: true };
}

export async function toggleSubtask(id: string): Promise<ActionResult> {
  const sub = await prisma.subtask.findUnique({ where: { id }, select: { id: true, taskId: true, done: true } });
  if (!sub) return { ok: false, error: "Subtask not found" };
  const ctx = await loadTaskForUser(sub.taskId, false);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  await prisma.subtask.update({ where: { id }, data: { done: !sub.done } });
  revalidatePath(`/tasks/${sub.taskId}`);
  return { ok: true };
}

export async function deleteSubtask(id: string): Promise<ActionResult> {
  const sub = await prisma.subtask.findUnique({ where: { id }, select: { id: true, taskId: true } });
  if (!sub) return { ok: false, error: "Subtask not found" };
  const ctx = await loadTaskForUser(sub.taskId, true);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  await prisma.subtask.delete({ where: { id } });
  revalidatePath(`/tasks/${sub.taskId}`);
  return { ok: true };
}
