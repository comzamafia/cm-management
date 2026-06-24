"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getCurrentUser } from "./auth";
import type { Entries } from "./action-plan-data";

// Only these two accounts (Sujee + Hang) may see/edit the Area Manager Action
// Plan. Both are OWNER, so access is gated by user id rather than role.
const ACTION_PLAN_USER_IDS = [
  "cmq92qov50001jo04684n5q3c", // Sujee
  "cmqfi1g790001kw044jtels01", // Hang
];

export async function canSeeActionPlan(user: { id: string } | null): Promise<boolean> {
  return !!user && ACTION_PLAN_USER_IDS.includes(user.id);
}

/** All entries for the given week + month periods, flattened to { key: value }. */
export async function getActionPlan(week: string, month: string): Promise<Entries> {
  const user = await getCurrentUser();
  if (!(await canSeeActionPlan(user))) return {};
  const rows = await prisma.actionPlanEntry.findMany({
    where: { period: { in: [week, month] } },
    select: { key: true, value: true },
  });
  const out: Entries = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

/** Reset all check/input data for the given periods. */
export async function resetActionPlan(
  week: string,
  month: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!(await canSeeActionPlan(user))) return { ok: false, error: "Not authorized" };
  await prisma.actionPlanEntry.deleteMany({
    where: { period: { in: [week, month] } },
  });
  revalidatePath("/action-plan");
  return { ok: true };
}

/** Upsert a single entry. Empty value clears it. */
export async function setActionPlanEntry(
  period: string,
  key: string,
  value: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!(await canSeeActionPlan(user))) return { ok: false, error: "Not authorized" };

  if (value === "") {
    await prisma.actionPlanEntry.deleteMany({ where: { period, key } });
  } else {
    await prisma.actionPlanEntry.upsert({
      where: { period_key: { period, key } },
      create: { period, key, value, updatedById: user!.id },
      update: { value, updatedById: user!.id },
    });
  }
  revalidatePath("/action-plan");
  return { ok: true };
}
