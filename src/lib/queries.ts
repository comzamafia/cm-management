import { Priority, Role, TaskStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { locationScopeWhere } from "./auth";
import { isOverdue } from "./labels";

type ScopeUser = { role: Role; locationId: string | null };

/** Tasks within the user's scope, newest first, with optional filters. */
export async function getTasks(
  user: ScopeUser,
  filters: {
    status?: TaskStatus;
    locationId?: string;
    assigneeId?: string;
    priority?: Priority;
    categoryId?: string;
    q?: string;
  } = {},
) {
  const scope = await locationScopeWhere(user);
  const tasks = await prisma.task.findMany({
    where: {
      ...scope,
      ...(filters.locationId ? { locationId: filters.locationId } : {}),
      ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.q
        ? {
            OR: [
              { title: { contains: filters.q, mode: "insensitive" } },
              { description: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { location: true, assignee: true, assigner: true },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
  });

  const withDerived = tasks.map((t) => ({
    ...t,
    derivedStatus: isOverdue(t.dueAt, t.status) ? ("OVERDUE" as TaskStatus) : t.status,
  }));

  return filters.status
    ? withDerived.filter((t) => t.derivedStatus === filters.status)
    : withDerived;
}

export async function getTaskDetail(id: string, user: ScopeUser) {
  const scope = await locationScopeWhere(user);
  const [task, activity] = await Promise.all([
    prisma.task.findFirst({
      where: { id, ...scope },
      include: {
        location: true,
        assignee: true,
        assigner: true,
        category: { select: { id: true, name: true, color: true } },
        attachments: true,
        completions: {
          include: { completedBy: true, verifiedBy: true },
          orderBy: { completedAt: "desc" },
        },
        comments: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
        subtasks: { orderBy: { position: "asc" } },
      },
    }),
    prisma.activityLog.findMany({
      where: { entityId: id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { timestamp: "desc" },
      take: 30,
    }),
  ]);
  if (!task) return null;

  return Object.assign(task, {
    derivedStatus: (isOverdue(task.dueAt, task.status) ? "OVERDUE" : task.status) as TaskStatus,
    activity,
  });
}

/** Personal work for the signed-in user: their assigned tasks + quick counts. */
export async function getMyWork(user: { id: string }) {
  const tasks = await prisma.task.findMany({
    where: { assigneeId: user.id },
    include: { location: { select: { name: true } } },
  });

  const withDerived = tasks.map((t) => ({
    ...t,
    derivedStatus: isOverdue(t.dueAt, t.status) ? ("OVERDUE" as TaskStatus) : t.status,
  }));

  // Actionable = not yet closed.
  const open = withDerived.filter(
    (t) => t.derivedStatus !== "DONE" && t.derivedStatus !== "VERIFIED",
  );

  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(startToday.getTime() + 86400000);
  const dueToday = open.filter(
    (t) => t.dueAt && t.dueAt >= startToday && t.dueAt < endToday,
  ).length;

  // Overdue first, then by soonest due date.
  const rank = (s: TaskStatus) => (s === "OVERDUE" ? 0 : s === "IN_PROGRESS" ? 1 : 2);
  const list = open
    .sort((a, b) => {
      const r = rank(a.derivedStatus) - rank(b.derivedStatus);
      if (r !== 0) return r;
      return (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity);
    })
    .slice(0, 8);

  return {
    tasks: list,
    counts: {
      open: open.length,
      overdue: open.filter((t) => t.derivedStatus === "OVERDUE").length,
      inProgress: open.filter((t) => t.derivedStatus === "IN_PROGRESS").length,
      dueToday,
      doneThisCycle: withDerived.filter(
        (t) => t.derivedStatus === "DONE" || t.derivedStatus === "VERIFIED",
      ).length,
    },
  };
}

/**
 * Manager/Owner landing dashboard (mockup layout): today's operational tasks,
 * weekly recurring planner, upcoming items, category counts, and today's
 * completion count. All scoped to the user's locations. Read-only.
 */
export async function getManagerDashboard(user: { id: string; role: Role; locationId: string | null }) {
  const scope = await locationScopeWhere(user);
  const scopeIds = scope.locationId?.in ?? null; // null = all locations

  const now = new Date();
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(startToday.getTime() + 86400000);
  // Monday → Sunday of the current week (local).
  const monday = new Date(startToday);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  });
  const weekEnd = new Date(weekDates[6]); weekEnd.setHours(23, 59, 59, 999);
  const col = (d: Date) => (d.getDay() + 6) % 7; // Mon=0 … Sun=6

  const [completedToday, todayRaw, templates, weekTasks, upcomingRaw, categories, genToday, users] = await Promise.all([
    prisma.taskCompletion.count({ where: { completedById: user.id, completedAt: { gte: startToday } } }),
    // Today's operational tasks across scope: due today, still open.
    prisma.task.findMany({
      where: { ...scope, status: { in: ["PENDING", "IN_PROGRESS"] }, dueAt: { gte: startToday, lt: endToday } },
      include: { category: { select: { name: true, color: true } }, location: { select: { name: true } }, assignee: { select: { id: true, name: true } } },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
      take: 12,
    }),
    prisma.checklistTemplate.findMany({
      where: {
        active: true,
        ...(scopeIds === null ? {} : { OR: [{ locationId: { in: scopeIds } }, { locationId: null }] }),
      },
      select: { id: true, name: true, frequency: true, weekDay: true, monthDay: true, items: true },
      orderBy: { createdAt: "asc" },
      take: 8,
    }),
    // One-off tasks scheduled within this week (for the "Scheduled" planner rows).
    prisma.task.findMany({
      where: { ...scope, type: "ONE_OFF", dueAt: { gte: monday, lte: weekEnd } },
      select: { id: true, title: true, dueAt: true },
      orderBy: { dueAt: "asc" },
      take: 8,
    }),
    prisma.task.findMany({
      where: { ...scope, status: { in: ["PENDING", "IN_PROGRESS"] }, dueAt: { gte: endToday } },
      include: { location: { select: { name: true } } },
      orderBy: { dueAt: "asc" },
      take: 6,
    }),
    prisma.category.findMany({
      where: scopeIds === null ? {} : { OR: [{ locationId: { in: scopeIds } }, { locationId: null }] },
      select: { id: true, name: true, color: true, _count: { select: { tasks: true } } },
      orderBy: { position: "asc" },
    }),
    prisma.checklistGeneration.findMany({
      where: { generatedAt: { gte: startToday } },
      select: { templateId: true },
    }),
    prisma.user.findMany({
      where: { ...scope, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const todayTasks = todayRaw.map((t) => ({
    id: t.id,
    title: t.title,
    status: isOverdue(t.dueAt, t.status) ? ("OVERDUE" as TaskStatus) : t.status,
    priority: t.priority,
    categoryName: t.category?.name ?? null,
    categoryColor: t.category?.color ?? null,
    locationName: t.location.name,
    assigneeId: t.assignee?.id ?? null,
    assigneeName: t.assignee?.name ?? null,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    proofRequired: t.proofRequired,
  }));

  // Weekly planner rows from recurring templates + scheduled one-offs.
  type Cadence = "DAILY" | "WEEKLY" | "SCHEDULED";
  const plannerRows: { label: string; cadence: Cadence; days: number[] }[] = [];
  for (const tpl of templates) {
    if (tpl.frequency === "DAILY") {
      plannerRows.push({ label: tpl.name, cadence: "DAILY", days: [0, 1, 2, 3, 4, 5, 6] });
    } else if (tpl.frequency === "WEEKLY" && tpl.weekDay != null) {
      plannerRows.push({ label: tpl.name, cadence: "WEEKLY", days: [(tpl.weekDay + 6) % 7] });
    } else if (tpl.frequency === "MONTHLY" && tpl.monthDay != null) {
      const hit = weekDates.find((d) => d.getDate() === tpl.monthDay);
      if (hit) plannerRows.push({ label: tpl.name, cadence: "SCHEDULED", days: [col(hit)] });
    }
  }
  for (const t of weekTasks) {
    if (!t.dueAt) continue;
    plannerRows.push({ label: t.title, cadence: "SCHEDULED", days: [col(new Date(t.dueAt))] });
  }
  const dayCounts = weekDates.map((_, i) => plannerRows.filter((r) => r.days.includes(i)).length);

  const upcoming = upcomingRaw.map((t) => ({
    id: t.id,
    title: t.title,
    locationName: t.location.name,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
  }));

  // Checklist items that *should* be done today but haven't been generated yet.
  const genIds = new Set(genToday.map((g) => g.templateId));
  const utcDay = now.getUTCDay();
  const utcDate = now.getUTCDate();
  const dueToday = (tpl: { frequency: string; weekDay: number | null; monthDay: number | null }) =>
    tpl.frequency === "DAILY" ||
    (tpl.frequency === "WEEKLY" && tpl.weekDay === utcDay) ||
    (tpl.frequency === "MONTHLY" && tpl.monthDay === utcDate);
  const pendingChecklists: { key: string; title: string; templateName: string }[] = [];
  for (const tpl of templates) {
    if (genIds.has(tpl.id) || !dueToday(tpl)) continue;
    const items = (tpl.items as string[]) ?? [];
    items.forEach((item, i) => pendingChecklists.push({ key: `${tpl.id}-${i}`, title: item, templateName: tpl.name }));
  }

  return {
    completedToday,
    todayTasks,
    pendingChecklists: pendingChecklists.slice(0, 8),
    planner: { weekDates: weekDates.map((d) => d.toISOString()), rows: plannerRows.slice(0, 12), dayCounts },
    upcoming,
    categories: categories.map((c) => ({ id: c.id, name: c.name, color: c.color, count: c._count.tasks })),
    users,
  };
}

/** Company / scoped overview metrics for the dashboard. */
export async function getDashboardData(user: ScopeUser) {
  const scope = await locationScopeWhere(user);

  const [locations, tasks, activity] = await Promise.all([
    prisma.location.findMany({
      where: scope.locationId ? { id: scope.locationId } : {},
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({ where: scope, include: { location: true, assignee: true } }),
    prisma.activityLog.findMany({
      where: scope,
      include: { user: true, location: true },
      orderBy: { timestamp: "desc" },
      take: 12,
    }),
  ]);

  const withDerived = tasks.map((t) => ({
    ...t,
    derivedStatus: isOverdue(t.dueAt, t.status) ? ("OVERDUE" as TaskStatus) : t.status,
  }));

  const byLocation = locations.map((loc) => {
    const locTasks = withDerived.filter((t) => t.locationId === loc.id);
    const total = locTasks.length;
    const done = locTasks.filter((t) => t.derivedStatus === "DONE" || t.derivedStatus === "VERIFIED").length;
    const overdue = locTasks.filter((t) => t.derivedStatus === "OVERDUE").length;
    return {
      location: loc,
      total,
      done,
      overdue,
      rate: total === 0 ? null : Math.round((done / total) * 100),
    };
  });

  const overdueTasks = withDerived
    .filter((t) => t.derivedStatus === "OVERDUE")
    .sort((a, b) => (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0));

  const totals = {
    total: withDerived.length,
    pending: withDerived.filter((t) => t.derivedStatus === "PENDING").length,
    inProgress: withDerived.filter((t) => t.derivedStatus === "IN_PROGRESS").length,
    done: withDerived.filter((t) => t.derivedStatus === "DONE").length,
    verified: withDerived.filter((t) => t.derivedStatus === "VERIFIED").length,
    overdue: overdueTasks.length,
  };

  return { byLocation, overdueTasks, activity, totals };
}
