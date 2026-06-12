"use server";

import { revalidatePath } from "next/cache";
import { AttachmentType, Role } from "@prisma/client";
import { prisma } from "./prisma";
import { getCurrentUser, atLeast, scopedLocationIds } from "./auth";
import { logActivity } from "./activity";

export type ActionResult = { ok: boolean; error?: string };

async function canEditTask(taskId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" as const };
  if (!atLeast(user.role, Role.SHIFT_LEAD)) return { error: "Shift leads and managers only" as const };
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true, locationId: true } });
  if (!task) return { error: "Task not found" as const };
  const scope = await scopedLocationIds(user);
  if (scope !== null && !scope.includes(task.locationId)) return { error: "Outside your location scope" as const };
  return { user, task };
}

export async function addAttachment(input: {
  taskId: string;
  type: AttachmentType;
  url: string;
}): Promise<ActionResult> {
  const url = input.url.trim();
  if (!url) return { ok: false, error: "URL is required" };
  const ctx = await canEditTask(input.taskId);
  if ("error" in ctx) return { ok: false, error: ctx.error };

  await prisma.$transaction(async (tx) => {
    const att = await tx.attachment.create({
      data: { taskId: input.taskId, type: input.type, url },
    });
    await logActivity(tx, {
      userId: ctx.user.id,
      action: "task.attachment_added",
      entity: "Task",
      entityId: input.taskId,
      locationId: ctx.task.locationId,
      meta: { type: input.type, attachmentId: att.id },
    });
  });

  revalidatePath(`/tasks/${input.taskId}`);
  return { ok: true };
}

export async function deleteAttachment(attachmentId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!atLeast(user.role, Role.SHIFT_LEAD)) return { ok: false, error: "Shift leads and managers only" };

  const att = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { task: { select: { id: true, locationId: true } } },
  });
  if (!att) return { ok: false, error: "Attachment not found" };
  // This action is for task attachments only; project files use removeProjectFile.
  if (!att.task) return { ok: false, error: "Not a task attachment" };
  const task = att.task;
  const scope = await scopedLocationIds(user);
  if (scope !== null && !scope.includes(task.locationId)) return { ok: false, error: "Out of scope" };

  await prisma.$transaction(async (tx) => {
    await tx.attachment.delete({ where: { id: attachmentId } });
    await logActivity(tx, {
      userId: user.id,
      action: "task.attachment_removed",
      entity: "Task",
      entityId: task.id,
      locationId: task.locationId,
      meta: { type: att.type },
    });
  });

  revalidatePath(`/tasks/${task.id}`);
  return { ok: true };
}
