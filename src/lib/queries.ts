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
