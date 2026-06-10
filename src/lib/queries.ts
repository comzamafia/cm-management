import { Role, TaskStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { locationScopeWhere } from "./auth";
import { isOverdue } from "./labels";

type ScopeUser = { role: Role; locationId: string | null };

/** Tasks within the user's scope, newest first, with optional filters. */
export async function getTasks(
  user: ScopeUser,
  filters: { status?: TaskStatus; locationId?: string; assigneeId?: string } = {},
) {
  const scope = await locationScopeWhere(user);
  const tasks = await prisma.task.findMany({
    where: {
      ...scope,
      ...(filters.locationId ? { locationId: filters.locationId } : {}),
      ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
    },
    include: { location: true, assignee: true, assigner: true },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
  });

  // Apply derived OVERDUE and optional status filter in memory (overdue isn't stored).
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
  const task = await prisma.task.findFirst({
    where: { id, ...scope },
    include: {
      location: true,
      assignee: true,
      assigner: true,
      attachments: true,
      completions: { include: { completedBy: true, verifiedBy: true }, orderBy: { completedAt: "desc" } },
    },
  });
  if (!task) return null;
  return { ...task, derivedStatus: isOverdue(task.dueAt, task.status) ? ("OVERDUE" as TaskStatus) : task.status };
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

  // Per-location completion rate (Verified or Done over total).
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
