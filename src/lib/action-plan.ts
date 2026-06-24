"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getCurrentUser } from "./auth";
import type { Entries, WeeklyTask, MonthlyTask, VendorItem } from "./action-plan-data";

const ACTION_PLAN_USER_IDS = [
  "cmq92qov50001jo04684n5q3c", // Sujee
  "cmqfi1g790001kw044jtels01", // Hang
];

export async function canSeeActionPlan(user: { id: string } | null): Promise<boolean> {
  return !!user && ACTION_PLAN_USER_IDS.includes(user.id);
}

// ── Load task definitions from DB ──────────────────────────────────────────

export type ActionPlanTasks = {
  weekly: WeeklyTask[];
  monthly: MonthlyTask[];
  vendors: VendorItem[];
};

export async function getActionPlanTasks(): Promise<ActionPlanTasks> {
  const rows = await prisma.actionPlanTask.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const weekly: WeeklyTask[] = [];
  const monthly: MonthlyTask[] = [];
  const vendors: VendorItem[] = [];

  for (const r of rows) {
    if (r.tab === "weekly") {
      weekly.push({
        id: r.taskKey,
        task: r.name,
        category: r.category ?? "Other",
        location: r.location ?? "All",
        days: r.days,
      });
    } else if (r.tab === "monthly") {
      monthly.push({
        id: r.taskKey,
        task: r.name,
        dueDay: r.dueDay ?? 1,
        deadlineMode: (r.deadlineMode as "same" | "next_month_15") ?? "same",
        mode: (r.mode as "all" | "grid") ?? "all",
        applicable: r.applicable,
      });
    } else if (r.tab === "vendor") {
      vendors.push({ id: r.taskKey, name: r.name });
    }
  }

  monthly.sort((a, b) => a.dueDay - b.dueDay);
  return { weekly, monthly, vendors };
}

// ── Entries CRUD ───────────────────────────────────────────────────────────

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

// ── Task definitions CRUD ──────────────────────────────────────────────────

export async function addActionPlanTask(input: {
  tab: "weekly" | "monthly" | "vendor";
  name: string;
  category?: string;
  location?: string;
  days?: number[];
  dueDay?: number;
  deadlineMode?: string;
  mode?: string;
  applicable?: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!(await canSeeActionPlan(user))) return { ok: false, error: "Not authorized" };
  if (!input.name.trim()) return { ok: false, error: "Name is required" };

  const taskKey = `${input.tab[0]}-${Date.now()}`;
  const max = await prisma.actionPlanTask.aggregate({
    where: { tab: input.tab },
    _max: { sortOrder: true },
  });

  await prisma.actionPlanTask.create({
    data: {
      tab: input.tab,
      taskKey,
      name: input.name.trim(),
      category: input.category?.trim() || null,
      location: input.location?.trim() || null,
      days: input.days ?? [],
      dueDay: input.dueDay ?? null,
      deadlineMode: input.deadlineMode ?? null,
      mode: input.mode ?? null,
      applicable: input.applicable ?? [],
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath("/action-plan");
  return { ok: true };
}

export async function removeActionPlanTask(
  taskKey: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!(await canSeeActionPlan(user))) return { ok: false, error: "Not authorized" };
  await prisma.actionPlanTask.deleteMany({ where: { taskKey } });
  revalidatePath("/action-plan");
  return { ok: true };
}
