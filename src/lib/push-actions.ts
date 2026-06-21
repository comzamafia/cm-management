"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
import { prisma } from "./prisma";
import { sendPushToUser } from "./push";
import type { PushCategory } from "./push-meta";

export type ActionResult = { ok: boolean; error?: string };

const CATEGORIES: PushCategory[] = ["tasks", "mentions", "maintenance", "compliance"];

/** Send a test notification to the current user's devices. */
export async function sendTestPush(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const count = await prisma.pushSubscription.count({ where: { userId: user.id } });
  if (count === 0) return { ok: false, error: "No device subscribed yet — enable notifications first." };
  await sendPushToUser(user.id, {
    title: "Test notification ✅",
    body: "Push is working on this device. You'll get task & alert notifications here.",
    url: "/notifications",
    tag: "test",
  });
  return { ok: true };
}

/** Save which push categories the current user has muted. */
export async function updateMyPushPrefs(muted: string[]): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const clean = [...new Set(muted)].filter((c): c is PushCategory => (CATEGORIES as string[]).includes(c));
  await prisma.user.update({ where: { id: user.id }, data: { mutedPush: clean } });
  revalidatePath("/notifications");
  return { ok: true };
}

type SubInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
};

/** Save (or refresh) the current user's push subscription for this device. */
export async function savePushSubscription(input: SubInput): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!input.endpoint || !input.p256dh || !input.auth) {
    return { ok: false, error: "Invalid subscription" };
  }

  // Upsert by endpoint so re-subscribing the same browser updates ownership/keys.
  await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: {
      userId: user.id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent ?? null,
    },
    update: {
      userId: user.id,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent ?? null,
    },
  });

  return { ok: true };
}

/** Remove a subscription (this device opted out). */
export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return { ok: true };
}
