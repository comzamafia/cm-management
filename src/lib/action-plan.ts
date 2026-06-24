"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getCurrentUser } from "./auth";
import { hasGlobalScope } from "./rules";
import type { Entries, WeeklyTask, MonthlyTask, VendorItem } from "./action-plan-data";

// ── Access control ───────────────────────────────────────────────────────
// Each page has its own allowlist. Checked by user id, not role, except
// for the marketing page which also admits all Owners.

const ACTION_PLAN_IDS = [
  "cmq92qov50001jo04684n5q3c", // Sujee
  "cmqfi1g790001kw044jtels01", // Hang
];

const MARKETING_IDS = [
  "cmql49svj0001kw046vqakazr", // Vincent
];

export type PlanPage = "action-plan" | "marketing";

export async function canSeePlan(
  page: PlanPage,
  user: { id: string; role: string } | null,
): Promise<boolean> {
  if (!user) return false;
  if (page === "action-plan") return ACTION_PLAN_IDS.includes(user.id);
  // marketing: Vincent + all Owners
  return MARKETING_IDS.includes(user.id) || hasGlobalScope(user.role as import("@prisma/client").Role);
}

// legacy wrapper for layout/sidebar
export async function canSeeActionPlan(user: { id: string } | null): Promise<boolean> {
  if (!user) return false;
  return ACTION_PLAN_IDS.includes(user.id);
}

export async function canSeeMarketing(user: { id: string; role: string } | null): Promise<boolean> {
  return canSeePlan("marketing", user);
}

// ── Load task definitions from DB ──────────────────────────────────────────

export type ActionPlanTasks = {
  weekly: WeeklyTask[];
  monthly: MonthlyTask[];
  vendors: VendorItem[];
};

export async function getActionPlanTasks(page: PlanPage): Promise<ActionPlanTasks> {
  const rows = await prisma.actionPlanTask.findMany({
    where: { page, active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const weekly: WeeklyTask[] = [];
  const monthly: MonthlyTask[] = [];
  const vendors: VendorItem[] = [];

  for (const r of rows) {
    if (r.tab === "weekly") {
      weekly.push({ id: r.taskKey, task: r.name, category: r.category ?? "Other", location: r.location ?? "All", days: r.days });
    } else if (r.tab === "monthly") {
      monthly.push({ id: r.taskKey, task: r.name, dueDay: r.dueDay ?? 1, deadlineMode: (r.deadlineMode as "same" | "next_month_15") ?? "same", mode: (r.mode as "all" | "grid") ?? "all", applicable: r.applicable });
    } else if (r.tab === "vendor") {
      vendors.push({ id: r.taskKey, name: r.name });
    }
  }

  monthly.sort((a, b) => a.dueDay - b.dueDay);
  return { weekly, monthly, vendors };
}

// ── Entries CRUD ───────────────────────────────────────────────────────────

export async function getActionPlan(page: PlanPage, week: string, month: string): Promise<Entries> {
  const user = await getCurrentUser();
  if (!(await canSeePlan(page, user))) return {};
  const rows = await prisma.actionPlanEntry.findMany({
    where: { page, period: { in: [week, month] } },
    select: { key: true, value: true },
  });
  const out: Entries = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export async function setActionPlanEntry(
  page: PlanPage, period: string, key: string, value: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!(await canSeePlan(page, user))) return { ok: false, error: "Not authorized" };

  if (value === "") {
    await prisma.actionPlanEntry.deleteMany({ where: { page, period, key } });
  } else {
    await prisma.actionPlanEntry.upsert({
      where: { page_period_key: { page, period, key } },
      create: { page, period, key, value, updatedById: user!.id },
      update: { value, updatedById: user!.id },
    });
  }
  revalidatePath(`/${page}`);
  if (page === "action-plan") revalidatePath("/action-plan");
  if (page === "marketing") revalidatePath("/marketing");
  return { ok: true };
}

export async function resetActionPlan(
  page: PlanPage, week: string, month: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!(await canSeePlan(page, user))) return { ok: false, error: "Not authorized" };
  await prisma.actionPlanEntry.deleteMany({
    where: { page, period: { in: [week, month] } },
  });
  revalidatePath(`/${page}`);
  return { ok: true };
}

// ── Task definitions CRUD ──────────────────────────────────────────────────

export async function addActionPlanTask(input: {
  page: PlanPage;
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
  if (!(await canSeePlan(input.page, user))) return { ok: false, error: "Not authorized" };
  if (!input.name.trim()) return { ok: false, error: "Name is required" };

  const taskKey = `${input.tab[0]}-${Date.now()}`;
  const max = await prisma.actionPlanTask.aggregate({
    where: { page: input.page, tab: input.tab },
    _max: { sortOrder: true },
  });

  await prisma.actionPlanTask.create({
    data: {
      page: input.page,
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

  revalidatePath(`/${input.page}`);
  return { ok: true };
}

export async function removeActionPlanTask(
  taskKey: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  const task = await prisma.actionPlanTask.findUnique({ where: { taskKey } });
  if (!task) return { ok: false, error: "Not found" };
  if (!(await canSeePlan(task.page as PlanPage, user))) return { ok: false, error: "Not authorized" };
  await prisma.actionPlanTask.delete({ where: { taskKey } });
  revalidatePath(`/${task.page}`);
  return { ok: true };
}

export async function updateActionPlanTask(
  taskKey: string,
  fields: {
    name?: string; category?: string; location?: string; days?: number[];
    dueDay?: number; deadlineMode?: string; mode?: string; applicable?: string[];
  },
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  const existing = await prisma.actionPlanTask.findUnique({ where: { taskKey } });
  if (!existing) return { ok: false, error: "Task not found" };
  if (!(await canSeePlan(existing.page as PlanPage, user))) return { ok: false, error: "Not authorized" };

  await prisma.actionPlanTask.update({
    where: { taskKey },
    data: {
      ...(fields.name != null ? { name: fields.name.trim() } : {}),
      ...(fields.category !== undefined ? { category: fields.category?.trim() || null } : {}),
      ...(fields.location !== undefined ? { location: fields.location?.trim() || null } : {}),
      ...(fields.days != null ? { days: fields.days } : {}),
      ...(fields.dueDay != null ? { dueDay: fields.dueDay } : {}),
      ...(fields.deadlineMode !== undefined ? { deadlineMode: fields.deadlineMode } : {}),
      ...(fields.mode !== undefined ? { mode: fields.mode } : {}),
      ...(fields.applicable != null ? { applicable: fields.applicable } : {}),
    },
  });
  revalidatePath(`/${existing.page}`);
  return { ok: true };
}

export async function reorderActionPlanTask(
  taskKey: string, direction: "up" | "down",
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  const task = await prisma.actionPlanTask.findUnique({ where: { taskKey } });
  if (!task) return { ok: false, error: "Task not found" };
  if (!(await canSeePlan(task.page as PlanPage, user))) return { ok: false, error: "Not authorized" };

  const sibling = await prisma.actionPlanTask.findFirst({
    where: {
      page: task.page, tab: task.tab, active: true,
      sortOrder: direction === "up" ? { lt: task.sortOrder } : { gt: task.sortOrder },
    },
    orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
  });
  if (!sibling) return { ok: true };

  await prisma.$transaction([
    prisma.actionPlanTask.update({ where: { id: task.id }, data: { sortOrder: sibling.sortOrder } }),
    prisma.actionPlanTask.update({ where: { id: sibling.id }, data: { sortOrder: task.sortOrder } }),
  ]);
  revalidatePath(`/${task.page}`);
  return { ok: true };
}
