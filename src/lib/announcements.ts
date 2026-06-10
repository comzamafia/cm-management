"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getCurrentUser, atLeast } from "./auth";
import { Role } from "@prisma/client";

export type AnnouncementWithMeta = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: Date;
  locationId: string | null;
  locationName: string | null;
  authorName: string;
  readByMe: boolean;
  readCount: number;
};

export async function getAnnouncements(): Promise<AnnouncementWithMeta[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const where =
    user.role === Role.OWNER || user.role === Role.AREA_MANAGER
      ? {}
      : {
          OR: [
            { locationId: null },
            { locationId: user.locationId ?? "" },
          ],
        };

  const rows = await prisma.announcement.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: { name: true } },
      location: { select: { name: true } },
      reads: { select: { userId: true } },
    },
  });

  return rows.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    pinned: a.pinned,
    createdAt: a.createdAt,
    locationId: a.locationId,
    locationName: a.location?.name ?? null,
    authorName: a.author.name,
    readByMe: a.reads.some((r) => r.userId === user.id),
    readCount: a.reads.length,
  }));
}

export async function getUnreadAnnouncementCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;

  const where =
    user.role === Role.OWNER || user.role === Role.AREA_MANAGER
      ? {}
      : {
          OR: [
            { locationId: null },
            { locationId: user.locationId ?? "" },
          ],
        };

  const total = await prisma.announcement.count({ where });
  const read = await prisma.announcementRead.count({
    where: { userId: user.id },
  });
  return Math.max(0, total - read);
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  pinned: boolean;
  locationId: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!atLeast(user.role, Role.STORE_MANAGER))
    return { ok: false, error: "Managers only" };

  // Non-owners can only post to their own location
  const locationId =
    atLeast(user.role, Role.AREA_MANAGER) ? input.locationId : user.locationId;

  await prisma.$transaction(async (tx) => {
    const ann = await tx.announcement.create({
      data: {
        title: input.title.trim(),
        body: input.body.trim(),
        pinned: input.pinned,
        locationId,
        authorId: user.id,
      },
    });
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "announcement.created",
        entity: "Announcement",
        entityId: ann.id,
        locationId: locationId ?? null,
        meta: { title: input.title },
      },
    });
    // Notify all users in scope
    const targetUsers = await tx.user.findMany({
      where: locationId
        ? { locationId, status: "ACTIVE" }
        : { status: "ACTIVE" },
      select: { id: true },
    });
    await tx.notification.createMany({
      data: targetUsers
        .filter((u) => u.id !== user.id)
        .map((u) => ({
          userId: u.id,
          type: "ANNOUNCEMENT" as const,
          title: `New announcement: ${input.title}`,
          body: input.body.slice(0, 120),
          entityId: ann.id,
          entityType: "Announcement",
        })),
      skipDuplicates: true,
    });
  });

  revalidatePath("/announcements");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function markAnnouncementRead(
  announcementId: string,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.announcementRead.upsert({
    where: { announcementId_userId: { announcementId, userId: user.id } },
    create: { announcementId, userId: user.id },
    update: {},
  });
  revalidatePath("/announcements");
}

export async function togglePin(
  announcementId: string,
  pinned: boolean,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !atLeast(user.role, Role.STORE_MANAGER)) return;
  await prisma.announcement.update({
    where: { id: announcementId },
    data: { pinned },
  });
  revalidatePath("/announcements");
}

export async function deleteAnnouncement(
  announcementId: string,
): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !atLeast(user.role, Role.STORE_MANAGER)) return;
  await prisma.announcement.delete({ where: { id: announcementId } });
  revalidatePath("/announcements");
}
