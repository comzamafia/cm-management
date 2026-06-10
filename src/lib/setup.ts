"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getCurrentUser } from "./auth";
import { MONTHLY_CHECKLIST } from "./monthly-checklist";
import type { ActionResult } from "./tasks";

/**
 * Production setup: remove all demo/mock data (keeping the signed-in owner) and
 * load Hang's Monthly Checklist as real categories + tasks for the current month.
 * Owner-only and destructive — triggered explicitly from the board UI.
 */
export async function resetAndLoadReal(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (user.role !== "OWNER") return { ok: false, error: "Only the owner can reset data" };

  const now = new Date();
  const year = now.getUTCFullYear();
  const monthIndex = now.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const dueDate = (day: number) =>
    new Date(Date.UTC(year, monthIndex, Math.min(day, daysInMonth), 17, 0, 0));

  await prisma.$transaction(async (tx) => {
    // 1. Wipe mock data in FK-safe order.
    await tx.notification.deleteMany();
    await tx.activityLog.deleteMany();
    await tx.taskCompletion.deleteMany();
    await tx.attachment.deleteMany();
    await tx.task.deleteMany();
    await tx.checklistGeneration.deleteMany();
    await tx.checklistTemplate.deleteMany();
    await tx.category.deleteMany();
    await tx.location.updateMany({ data: { managerId: null } });
    await tx.user.updateMany({ data: { locationId: null } });
    await tx.user.deleteMany({ where: { id: { not: user.id } } });
    await tx.location.deleteMany();

    // 2. One real location for the company close.
    const location = await tx.location.create({
      data: { name: "Head Office", region: "Operations" },
    });

    // 3. Categories + tasks from Hang's Monthly Checklist.
    for (let ci = 0; ci < MONTHLY_CHECKLIST.length; ci++) {
      const cat = MONTHLY_CHECKLIST[ci];
      const category = await tx.category.create({
        data: { name: cat.title, color: cat.color, position: ci, createdById: user.id },
      });
      for (let ii = 0; ii < cat.items.length; ii++) {
        const item = cat.items[ii];
        await tx.task.create({
          data: {
            title: item.label,
            type: "RECURRING",
            priority: "MEDIUM",
            locationId: location.id,
            assignerId: user.id,
            categoryId: category.id,
            position: ii,
            dueAt: item.due ? dueDate(item.due) : null,
            status: "PENDING",
            proofRequired: false,
          },
        });
      }
    }

    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "board.setup",
        entity: "Category",
        entityId: "monthly-close",
        locationId: location.id,
        meta: { categories: MONTHLY_CHECKLIST.length },
      },
    });
  });

  revalidatePath("/board");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/people");
  return { ok: true };
}
