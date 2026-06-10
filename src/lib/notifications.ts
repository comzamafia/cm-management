"use server";

import { revalidatePath } from "next/cache";
import type { NotificationType, Prisma, PrismaClient } from "@prisma/client";
import { getCurrentUser } from "./auth";
import { prisma } from "./prisma";

export type NotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityId?: string;
  entityType?: string;
};

/**
 * Create a notification inside a transaction. Pass the tx client from the
 * enclosing transaction so the notification commits with the mutation.
 */
export async function createNotification(
  tx: Prisma.TransactionClient | PrismaClient,
  input: NotificationInput,
) {
  return tx.notification.create({ data: input });
}

/** Mark all unread notifications for the current user as read. */
export async function markAllRead(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  revalidatePath("/", "layout");
}

/** Mark a single notification read. */
export async function markRead(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.notification.update({
    where: { id, userId: user.id },
    data: { read: true },
  });
  revalidatePath("/", "layout");
}
