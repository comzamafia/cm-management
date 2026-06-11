"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { logActivity } from "./activity";
import { getCurrentUser } from "./auth";
import type { ActionResult } from "./tasks";

export async function createLocation(input: {
  name: string;
  address?: string;
  region?: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (user.role !== "OWNER" && user.role !== "AREA_MANAGER") {
    return { ok: false, error: "Only Owner or Area Manager can add branches" };
  }
  if (!input.name.trim()) return { ok: false, error: "Branch name is required" };

  await prisma.$transaction(async (tx) => {
    const loc = await tx.location.create({
      data: {
        name: input.name.trim(),
        address: input.address?.trim() || null,
        region: input.region?.trim() || null,
      },
    });
    await logActivity(tx, {
      userId: user.id,
      action: "location.created",
      entity: "Location",
      entityId: loc.id,
      locationId: loc.id,
      meta: { name: loc.name },
    });
  });

  revalidatePath("/people");
  revalidatePath("/tasks/new");
  revalidatePath("/checklists/new");
  return { ok: true };
}

export async function updateLocation(input: {
  id: string;
  name: string;
  address?: string;
  region?: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (user.role !== "OWNER" && user.role !== "AREA_MANAGER") {
    return { ok: false, error: "Only Owner or Area Manager can edit branches" };
  }
  if (!input.name.trim()) return { ok: false, error: "Branch name is required" };

  await prisma.location.update({
    where: { id: input.id },
    data: {
      name: input.name.trim(),
      address: input.address?.trim() || null,
      region: input.region?.trim() || null,
    },
  });

  revalidatePath("/people");
  revalidatePath("/tasks/new");
  return { ok: true };
}
