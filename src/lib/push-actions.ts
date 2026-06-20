"use server";

import { getCurrentUser } from "./auth";
import { prisma } from "./prisma";

export type ActionResult = { ok: boolean; error?: string };

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
