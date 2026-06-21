"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { createNotification } from "./notifications";
import { sendPushToUsers } from "./push";
import { getCurrentUser, isManager, scopedLocationIds } from "./auth";

export type ActionResult = { ok: true } | { ok: false; error: string };
const COMPANY = "company";

type ScopeUser = { id: string; role: Role; locationId: string | null };

/** Channels the user can see: the company-wide channel + each location in scope. */
export async function getChannels(user: ScopeUser) {
  const ids = await scopedLocationIds(user); // null = all locations
  const locations = await prisma.location.findMany({
    where: ids ? { id: { in: ids } } : {},
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return [
    { key: COMPANY, name: "Company-wide", locationId: null as string | null },
    ...locations.map((l) => ({ key: l.id, name: l.name, locationId: l.id })),
  ];
}

async function canAccess(user: ScopeUser, channel: string): Promise<boolean> {
  if (channel === COMPANY) return true;
  const ids = await scopedLocationIds(user);
  return ids === null || ids.includes(channel);
}

/** Messages for a channel (oldest → newest) plus the members available to @mention. */
export async function getChannelView(user: ScopeUser, channel: string) {
  if (!(await canAccess(user, channel))) return null;
  const locationId = channel === COMPANY ? null : channel;

  const [messages, members] = await Promise.all([
    prisma.message.findMany({
      where: { locationId },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: { user: { select: { id: true, name: true, role: true } } },
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE", ...(locationId ? { locationId } : {}) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return {
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      mentions: (m.mentions as string[]) ?? [],
      createdAt: m.createdAt.toISOString(),
      authorId: m.userId,
      authorName: m.user.name,
      canDelete: m.userId === user.id || isManager(user.role),
    })),
    members,
  };
}

export async function postMessage(
  channel: string,
  body: string,
  mentions: string[],
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!(await canAccess(user, channel))) return { ok: false, error: "No access to this channel" };
  const text = body.trim();
  if (!text) return { ok: false, error: "Message is empty" };
  if (text.length > 4000) return { ok: false, error: "Message too long" };

  const locationId = channel === COMPANY ? null : channel;
  const clean = [...new Set(mentions)].filter(Boolean);

  await prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: { locationId, userId: user.id, body: text, mentions: clean },
    });
    // Notify @mentioned users (except the author).
    for (const uid of clean) {
      if (uid === user.id) continue;
      await createNotification(tx, {
        userId: uid,
        type: "MENTION",
        title: `${user.name} mentioned you`,
        body: text.slice(0, 140),
        entityId: msg.id,
        entityType: "Message",
      });
    }
  });

  const recipients = clean.filter((uid) => uid !== user.id);
  if (recipients.length) {
    void sendPushToUsers(recipients, {
      title: `${user.name} mentioned you`,
      body: text.slice(0, 140),
      url: "/channels",
      tag: `channel-${channel}`,
      category: "mentions",
    });
  }

  revalidatePath("/channels");
  return { ok: true };
}

export async function deleteMessage(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const msg = await prisma.message.findUnique({ where: { id } });
  if (!msg) return { ok: false, error: "Message not found" };
  if (msg.userId !== user.id && !isManager(user.role))
    return { ok: false, error: "You can only delete your own messages" };

  await prisma.message.delete({ where: { id } });
  revalidatePath("/channels");
  return { ok: true };
}
