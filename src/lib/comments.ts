"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { logActivity } from "./activity";
import { getCurrentUser, isManager, scopedLocationIds } from "./auth";
import type { ActionResult } from "./tasks";

export async function addComment(taskId: string, body: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!body.trim()) return { ok: false, error: "Comment cannot be empty" };

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "Task not found" };

  const scope = await scopedLocationIds(user);
  if (scope !== null && !scope.includes(task.locationId)) {
    return { ok: false, error: "Outside your location scope" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.comment.create({ data: { taskId, userId: user.id, body: body.trim() } });
    await logActivity(tx, {
      userId: user.id,
      action: "task.commented",
      entity: "Task",
      entityId: taskId,
      locationId: task.locationId,
      meta: { excerpt: body.trim().slice(0, 80) },
    });
  });

  revalidatePath(`/tasks/${taskId}`);
  return { ok: true };
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) return { ok: false, error: "Comment not found" };

  const isOwn = comment.userId === user.id;
  if (!isOwn && !isManager(user.role)) return { ok: false, error: "Not authorized" };

  await prisma.comment.delete({ where: { id: commentId } });
  revalidatePath(`/tasks/${comment.taskId}`);
  return { ok: true };
}
