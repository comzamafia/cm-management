"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { logActivity } from "./activity";
import { getCurrentUser, isManager } from "./auth";
import type { ActionResult } from "./tasks";

export async function createCategory(input: {
  name: string;
  color?: string;
  locationId?: string | null;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role)) return { ok: false, error: "Only managers can add categories" };
  if (!input.name.trim()) return { ok: false, error: "Name is required" };

  const count = await prisma.category.count();
  await prisma.$transaction(async (tx) => {
    const cat = await tx.category.create({
      data: {
        name: input.name.trim(),
        color: input.color || "#0073ea",
        position: count,
        locationId: input.locationId ?? null,
        createdById: user.id,
      },
    });
    await logActivity(tx, {
      userId: user.id,
      action: "category.created",
      entity: "Category",
      entityId: cat.id,
      locationId: input.locationId ?? null,
      meta: { name: cat.name },
    });
  });

  revalidatePath("/board");
  return { ok: true };
}

export async function renameCategory(id: string, name: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role)) return { ok: false, error: "Only managers can edit categories" };
  if (!name.trim()) return { ok: false, error: "Name is required" };

  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat) return { ok: false, error: "Category not found" };

  await prisma.$transaction(async (tx) => {
    await tx.category.update({ where: { id }, data: { name: name.trim() } });
    await logActivity(tx, {
      userId: user.id,
      action: "category.renamed",
      entity: "Category",
      entityId: id,
      locationId: cat.locationId,
      meta: { from: cat.name, to: name.trim() },
    });
  });

  revalidatePath("/board");
  return { ok: true };
}

export async function recolorCategory(id: string, color: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role)) return { ok: false, error: "Only managers can edit categories" };

  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat) return { ok: false, error: "Category not found" };

  await prisma.category.update({ where: { id }, data: { color } });
  revalidatePath("/board");
  return { ok: true };
}

/** Delete a category. Its tasks are kept but detached (categoryId → null). */
export async function deleteCategory(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role)) return { ok: false, error: "Only managers can delete categories" };

  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat) return { ok: false, error: "Category not found" };

  await prisma.$transaction(async (tx) => {
    await tx.task.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
    await tx.category.delete({ where: { id } });
    await logActivity(tx, {
      userId: user.id,
      action: "category.deleted",
      entity: "Category",
      entityId: id,
      locationId: cat.locationId,
      meta: { name: cat.name },
    });
  });

  revalidatePath("/board");
  return { ok: true };
}
