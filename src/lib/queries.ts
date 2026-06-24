import { Priority, Role, TaskStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { locationScopeWhere } from "./auth";
import { isOverdue } from "./labels";
import { dayBoundsTZ, localWeekday, localDayOfMonth } from "./time";

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

export async function getTaskDetail(id: string, user: ScopeUser & { id: string }) {
  const scope = await locationScopeWhere(user);
  const isEmployee = user.role === "EMPLOYEE" || user.role === "NEW_HIRE";
  // Employees can open any task assigned to them even if location scope is narrow.
  const where = isEmployee
    ? { id, OR: [scope.locationId ? { locationId: scope.locationId } : {}, { assigneeId: user.id }] }
    : { id, ...scope };
  const [task, activity] = await Promise.all([
    prisma.task.findFirst({
      where,
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

  const { start: startToday, end: endToday } = dayBoundsTZ();
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
 * completion count. Personal — shows only the signed-in user's own tasks
 * (cross-team task visibility lives in /tasks). Read-only.
 */
export async function getManagerDashboard(
  viewer: { id: string; role: Role; locationId: string | null },
  subjectId?: string,
) {
  const subject = subjectId ?? viewer.id; // whose tasks to show (a manager may view a teammate)
  const scope = await locationScopeWhere(viewer);
  const scopeIds = scope.locationId?.in ?? null; // null = all locations

  const now = new Date();
  const { start: startToday, end: endToday } = dayBoundsTZ(now);
  // Monday → Sunday of the current week, anchored to the local (Toronto) timezone.
  const wd = localWeekday(now);
  const monday = new Date(startToday.getTime() - ((wd + 6) % 7) * 86400000);
  const weekDates = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * 86400000));
  const weekEnd = new Date(monday.getTime() + 7 * 86400000);
  const col = (d: Date) => (localWeekday(d) + 6) % 7; // Mon=0 … Sun=6

  // The landing dashboard is PERSONAL: every task widget shows only the
  // signed-in user's own work. Cross-team task visibility lives in /tasks.
  const mine = { assigneeId: subject };
  const [completedToday, todayRaw, templates, weekTasks, weekAllTasks, upcomingRaw, overdueRaw, categories, myCatCounts, genToday, users, activity] = await Promise.all([
    prisma.taskCompletion.count({ where: { completedById: subject, completedAt: { gte: startToday } } }),
    // My tasks due today, still open.
    prisma.task.findMany({
      where: { ...mine, status: { in: ["PENDING", "IN_PROGRESS"] }, dueAt: { gte: startToday, lt: endToday } },
      include: { category: { select: { name: true, color: true } }, location: { select: { name: true } }, assignee: { select: { id: true, name: true } } },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
      take: 12,
    }),
    // Recurring templates assigned to me (planner + pending-today).
    prisma.checklistTemplate.findMany({
      where: { active: true, assigneeId: subject },
      select: { id: true, name: true, frequency: true, weekDay: true, monthDay: true, items: true },
      orderBy: { createdAt: "asc" },
      take: 80,
    }),
    // My one-off tasks scheduled within this week (for the "Scheduled" planner rows).
    prisma.task.findMany({
      where: { ...mine, type: "ONE_OFF", dueAt: { gte: monday, lte: weekEnd } },
      select: { id: true, title: true, dueAt: true },
      orderBy: { dueAt: "asc" },
      take: 8,
    }),
    // All my tasks this week (any status) for planner completion status.
    prisma.task.findMany({
      where: { ...mine, dueAt: { gte: monday, lt: weekEnd } },
      select: { id: true, title: true, status: true, dueAt: true, proofRequired: true },
      orderBy: { dueAt: "asc" },
    }),
    // My upcoming tasks.
    prisma.task.findMany({
      where: { ...mine, status: { in: ["PENDING", "IN_PROGRESS"] }, dueAt: { gte: endToday } },
      include: { location: { select: { name: true } } },
      orderBy: { dueAt: "asc" },
      take: 6,
    }),
    // My overdue tasks.
    prisma.task.findMany({
      where: { ...mine, status: { in: ["PENDING", "IN_PROGRESS"] }, dueAt: { lt: startToday } },
      include: { location: { select: { name: true } } },
      orderBy: { dueAt: "asc" },
      take: 6,
    }),
    // Category names/colours in scope (counts below are MY tasks only).
    prisma.category.findMany({
      where: scopeIds === null ? {} : { OR: [{ locationId: { in: scopeIds } }, { locationId: null }] },
      select: { id: true, name: true, color: true },
      orderBy: { position: "asc" },
    }),
    prisma.task.groupBy({ by: ["categoryId"], where: { assigneeId: subject, categoryId: { not: null } }, _count: { _all: true } }),
    prisma.checklistGeneration.findMany({
      where: { generatedAt: { gte: startToday } },
      select: { templateId: true },
    }),
    // Assignable teammates (for the inline assign control) — scoped, not "my data".
    prisma.user.findMany({
      where: { ...scope, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    // Recent activity for the subject.
    prisma.activityLog.findMany({
      where: { userId: subject },
      include: { user: { select: { name: true } }, location: { select: { name: true } } },
      orderBy: { timestamp: "desc" },
      take: 8,
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
  // Group by label so a task that recurs on several weekdays is a single row.
  type Cadence = "DAILY" | "WEEKLY" | "SCHEDULED";
  const plannerMap = new Map<string, { label: string; cadence: Cadence; days: Set<number> }>();
  const addPlanner = (label: string, cadence: Cadence, days: number[]) => {
    const row = plannerMap.get(label) ?? { label, cadence, days: new Set<number>() };
    days.forEach((d) => row.days.add(d));
    // Promote toward the most "recurring" cadence colour.
    if (cadence === "DAILY" || row.days.size === 7) row.cadence = "DAILY";
    else if (cadence === "WEEKLY" && row.cadence !== "DAILY") row.cadence = "WEEKLY";
    plannerMap.set(label, row);
  };
  for (const tpl of templates) {
    if (tpl.frequency === "DAILY") addPlanner(tpl.name, "DAILY", [0, 1, 2, 3, 4, 5, 6]);
    else if (tpl.frequency === "WEEKLY" && tpl.weekDay != null) addPlanner(tpl.name, "WEEKLY", [(tpl.weekDay + 6) % 7]);
    else if (tpl.frequency === "MONTHLY" && tpl.monthDay != null) {
      const hit = weekDates.find((d) => d.getDate() === tpl.monthDay);
      if (hit) addPlanner(tpl.name, "SCHEDULED", [col(hit)]);
    }
  }
  for (const t of weekTasks) {
    if (!t.dueAt) continue;
    addPlanner(t.title, "SCHEDULED", [col(new Date(t.dueAt))]);
  }
  // Match week tasks to planner rows by title prefix (checklist tasks start with "[TemplateName] item").
  type CellTask = { id: string; status: string; proofRequired: boolean };
  type PlannerRow = { label: string; cadence: Cadence; days: number[]; cells: Record<number, CellTask | null> };

  const plannerRows: PlannerRow[] = [...plannerMap.values()].map((r) => {
    const days = [...r.days].sort();
    const cells: Record<number, CellTask | null> = {};
    for (const d of days) {
      const dayStart = weekDates[d];
      if (!dayStart) { cells[d] = null; continue; }
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const match = weekAllTasks.find(
        (t) => t.dueAt && t.dueAt >= dayStart && t.dueAt < dayEnd
          && (t.title === r.label || t.title.startsWith(`[${r.label}]`)),
      );
      cells[d] = match ? { id: match.id, status: match.status, proofRequired: match.proofRequired } : null;
    }
    return { label: r.label, cadence: r.cadence, days, cells };
  });
  const dayCounts = weekDates.map((_, i) => plannerRows.filter((r) => r.days.includes(i)).length);

  const upcoming = upcomingRaw.map((t) => ({
    id: t.id,
    title: t.title,
    locationName: t.location.name,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
  }));
  const overdueTasks = overdueRaw.map((t) => ({
    id: t.id,
    title: t.title,
    locationName: t.location.name,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
  }));

  // Checklist items that *should* be done today but haven't been generated yet.
  const genIds = new Set(genToday.map((g) => g.templateId));
  const localDay = localWeekday(now);
  const localDate = localDayOfMonth(now);
  const dueToday = (tpl: { frequency: string; weekDay: number | null; monthDay: number | null }) =>
    tpl.frequency === "DAILY" ||
    (tpl.frequency === "WEEKLY" && tpl.weekDay === localDay) ||
    (tpl.frequency === "MONTHLY" && tpl.monthDay === localDate);
  const pendingChecklists: { key: string; title: string; templateName: string }[] = [];
  for (const tpl of templates) {
    if (genIds.has(tpl.id) || !dueToday(tpl)) continue;
    const items = (tpl.items as string[]) ?? [];
    items.forEach((item, i) => pendingChecklists.push({ key: `${tpl.id}-${i}`, title: item, templateName: tpl.name }));
  }

  // My task count per category.
  const catCount = new Map(myCatCounts.map((g) => [g.categoryId, g._count._all]));

  return {
    completedToday,
    todayTasks,
    pendingChecklists: pendingChecklists.slice(0, 8),
    planner: { weekDates: weekDates.map((d) => d.toISOString()), rows: plannerRows.slice(0, 20), dayCounts },
    upcoming,
    overdueTasks,
    categories: categories.map((c) => ({ id: c.id, name: c.name, color: c.color, count: catCount.get(c.id) ?? 0 })),
    users,
    activity,
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
