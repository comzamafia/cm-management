"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getCurrentUser, atLeast } from "./auth";
import { Role, TrainingCategory } from "@prisma/client";
import type { TrainingMaterialItem } from "./training-meta";

export async function getTrainingMaterials(
  category?: TrainingCategory,
): Promise<TrainingMaterialItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const locationFilter =
    user.role === Role.OWNER || user.role === Role.AREA_MANAGER
      ? {}
      : {
          OR: [
            { locationId: null },
            { locationId: user.locationId ?? "" },
          ],
        };

  const rows = await prisma.trainingMaterial.findMany({
    where: { ...locationFilter, ...(category ? { category } : {}) },
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
    include: {
      createdBy: { select: { name: true } },
      location: { select: { name: true } },
    },
  });

  return rows.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    category: m.category,
    contentUrl: m.contentUrl,
    content: m.content,
    locationId: m.locationId,
    locationName: m.location?.name ?? null,
    createdByName: m.createdBy.name,
    createdAt: m.createdAt,
  }));
}

export async function createTrainingMaterial(input: {
  title: string;
  description: string;
  category: TrainingCategory;
  contentUrl: string;
  content: string;
  locationId: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!atLeast(user.role, Role.STORE_MANAGER))
    return { ok: false, error: "Managers only" };

  const locationId = atLeast(user.role, Role.AREA_MANAGER)
    ? input.locationId
    : user.locationId;

  await prisma.$transaction(async (tx) => {
    const mat = await tx.trainingMaterial.create({
      data: {
        title: input.title.trim(),
        description: input.description.trim() || null,
        category: input.category,
        contentUrl: input.contentUrl.trim() || null,
        content: input.content.trim() || null,
        locationId,
        createdById: user.id,
      },
    });
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "training.created",
        entity: "TrainingMaterial",
        entityId: mat.id,
        locationId: locationId ?? null,
        meta: { title: input.title, category: input.category },
      },
    });
  });

  revalidatePath("/training");
  return { ok: true };
}

export async function deleteTrainingMaterial(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !atLeast(user.role, Role.STORE_MANAGER)) return;
  await prisma.trainingMaterial.delete({ where: { id } });
  revalidatePath("/training");
}
