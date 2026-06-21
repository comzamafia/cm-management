"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getCurrentUser } from "./auth";
import { hasGlobalScope } from "./rules";

export type ActionResult = { ok: boolean; error?: string };

const DEFAULTS = {
  nearDueEnabled: true,
  nearDueHours: 2,
  complianceRemindersEnabled: true,
  complianceThresholds: [14, 7, 3, 1],
  pushEnabled: true,
};

export type NotificationSettingsValues = typeof DEFAULTS;

/** Read the singleton settings row, creating it with defaults on first access. */
export async function getNotificationSettings(): Promise<NotificationSettingsValues> {
  const row = await prisma.notificationSettings.findUnique({ where: { id: "default" } });
  if (!row) {
    return { ...DEFAULTS };
  }
  return {
    nearDueEnabled: row.nearDueEnabled,
    nearDueHours: row.nearDueHours,
    complianceRemindersEnabled: row.complianceRemindersEnabled,
    complianceThresholds: row.complianceThresholds.length ? row.complianceThresholds : DEFAULTS.complianceThresholds,
    pushEnabled: row.pushEnabled,
  };
}

export async function updateNotificationSettings(input: {
  nearDueEnabled: boolean;
  nearDueHours: number;
  complianceRemindersEnabled: boolean;
  complianceThresholds: number[];
  pushEnabled: boolean;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!hasGlobalScope(user.role)) return { ok: false, error: "Owner / Area Manager only" };

  // Sanitise.
  const nearDueHours = Math.min(Math.max(Math.round(input.nearDueHours), 1), 72);
  const thresholds = [...new Set(input.complianceThresholds.map((n) => Math.round(n)).filter((n) => n >= 1 && n <= 365))]
    .sort((a, b) => b - a);
  if (thresholds.length === 0) return { ok: false, error: "Add at least one compliance reminder day" };

  await prisma.notificationSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      nearDueEnabled: input.nearDueEnabled,
      nearDueHours,
      complianceRemindersEnabled: input.complianceRemindersEnabled,
      complianceThresholds: thresholds,
      pushEnabled: input.pushEnabled,
      updatedById: user.id,
    },
    update: {
      nearDueEnabled: input.nearDueEnabled,
      nearDueHours,
      complianceRemindersEnabled: input.complianceRemindersEnabled,
      complianceThresholds: thresholds,
      pushEnabled: input.pushEnabled,
      updatedById: user.id,
    },
  });

  revalidatePath("/settings/notifications");
  return { ok: true };
}
