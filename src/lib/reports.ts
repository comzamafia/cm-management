import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { locationScopeWhere } from "./auth";
import { isOverdue } from "./labels";

type ScopeUser = { role: Role; locationId: string | null };

// ── WHO ─────────────────────────────────────────────────────────────────────

export async function getUserStats(scope: ScopeUser) {
  const locationWhere = await locationScopeWhere(scope);

  const [users, tasks] = await Promise.all([
    prisma.user.findMany({
      where: { ...locationWhere, status: "ACTIVE" },
      include: { location: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: { ...locationWhere },
      select: { id: true, assigneeId: true, status: true, dueAt: true },
    }),
  ]);

  return users.map((u) => {
    const mine = tasks.filter((t) => t.assigneeId === u.id);
    const done = mine.filter((t) => t.status === "DONE" || t.status === "VERIFIED").length;
    const overdue = mine.filter((t) => isOverdue(t.dueAt, t.status) || t.status === "OVERDUE").length;
    return {
      user: u,
      total: mine.length,
      done,
      overdue,
      rate: mine.length === 0 ? null : Math.round((done / mine.length) * 100),
    };
  });
}

export async function getUserProfile(userId: string, scope: ScopeUser) {
  const locationWhere = await locationScopeWhere(scope);

  const [user, tasks, activity] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { location: true } }),
    prisma.task.findMany({
      where: { assigneeId: userId, ...locationWhere },
      include: { location: true },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.activityLog.findMany({
      where: { userId },
      include: { location: true },
      orderBy: { timestamp: "desc" },
      take: 12,
    }),
  ]);

  if (!user) return null;

  const allTasks = await prisma.task.findMany({
    where: { assigneeId: userId },
    select: { status: true, dueAt: true },
  });
  const done = allTasks.filter((t) => t.status === "DONE" || t.status === "VERIFIED").length;
  const overdue = allTasks.filter((t) => isOverdue(t.dueAt, t.status) || t.status === "OVERDUE").length;

  return {
    user,
    stats: { total: allTasks.length, done, overdue, rate: allTasks.length === 0 ? null : Math.round((done / allTasks.length) * 100) },
    recentTasks: tasks.map((t) => ({ ...t, derivedStatus: isOverdue(t.dueAt, t.status) ? ("OVERDUE" as const) : t.status })),
    activity,
  };
}

// ── WHAT ─────────────────────────────────────────────────────────────────────

export async function getDepartmentStats(scope: ScopeUser) {
  const locationWhere = await locationScopeWhere(scope);
  const tasks = await prisma.task.findMany({
    where: locationWhere,
    select: { id: true, department: true, status: true, dueAt: true, type: true, priority: true },
  });

  const map = new Map<string, { total: number; done: number; overdue: number; priorities: Record<string, number> }>();

  for (const t of tasks) {
    const dept = t.department ?? "Uncategorised";
    const entry = map.get(dept) ?? { total: 0, done: 0, overdue: 0, priorities: {} };
    entry.total++;
    if (t.status === "DONE" || t.status === "VERIFIED") entry.done++;
    if (isOverdue(t.dueAt, t.status) || t.status === "OVERDUE") entry.overdue++;
    entry.priorities[t.priority] = (entry.priorities[t.priority] ?? 0) + 1;
    map.set(dept, entry);
  }

  return Array.from(map.entries())
    .map(([dept, s]) => ({ dept, ...s, rate: s.total === 0 ? null : Math.round((s.done / s.total) * 100) }))
    .sort((a, b) => b.total - a.total);
}

// ── WHERE ─────────────────────────────────────────────────────────────────────

export async function getLocationDetail(locationId: string, scope: ScopeUser) {
  const locationWhere = await locationScopeWhere(scope);
  // Verify this location is in scope.
  if (locationWhere.locationId && !locationWhere.locationId.in.includes(locationId)) return null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [location, tasks, team, allLocations] = await Promise.all([
    prisma.location.findUnique({ where: { id: locationId }, include: { managedBy: true } }),
    prisma.task.findMany({
      where: { locationId },
      include: { assignee: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { locationId, status: "ACTIVE" },
      orderBy: { role: "asc" },
    }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!location) return null;

  const withDerived = tasks.map((t) => ({
    ...t,
    derivedStatus: isOverdue(t.dueAt, t.status) ? ("OVERDUE" as const) : t.status,
  }));

  const todaysTasks = withDerived.filter((t) => t.createdAt >= todayStart);
  const overdueList = withDerived.filter((t) => t.derivedStatus === "OVERDUE");
  const done = withDerived.filter((t) => t.derivedStatus === "DONE" || t.derivedStatus === "VERIFIED").length;
  const rate = tasks.length === 0 ? null : Math.round((done / tasks.length) * 100);

  // Company average for comparison.
  const allTasks = await prisma.task.findMany({ select: { status: true, dueAt: true } });
  const allDone = allTasks.filter((t) => t.status === "DONE" || t.status === "VERIFIED").length;
  const companyAvg = allTasks.length === 0 ? null : Math.round((allDone / allTasks.length) * 100);

  return { location, tasks: withDerived, todaysTasks, overdueList, team, rate, companyAvg, allLocations };
}

// ── WHEN ─────────────────────────────────────────────────────────────────────

export async function getTrendData(scope: ScopeUser, days = 14) {
  const locationWhere = await locationScopeWhere(scope);
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);

  const logs = await prisma.activityLog.findMany({
    where: { ...locationWhere, timestamp: { gte: since } },
    select: { action: true, timestamp: true },
    orderBy: { timestamp: "asc" },
  });

  // Build per-day buckets.
  const buckets: Record<string, { created: number; completed: number; verified: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    buckets[d.toISOString().slice(0, 10)] = { created: 0, completed: 0, verified: 0 };
  }

  for (const log of logs) {
    const key = log.timestamp.toISOString().slice(0, 10);
    if (!buckets[key]) continue;
    if (log.action === "task.created") buckets[key].created++;
    else if (log.action === "task.status_changed") buckets[key].completed++;
    else if (log.action === "task.verified") buckets[key].verified++;
  }

  return Object.entries(buckets).map(([date, counts]) => ({ date, ...counts }));
}

// ── CSV export ────────────────────────────────────────────────────────────────

export async function buildTasksCsv(scope: ScopeUser, period: "weekly" | "monthly") {
  const locationWhere = await locationScopeWhere(scope);
  const since = new Date();
  since.setDate(since.getDate() - (period === "weekly" ? 7 : 30));

  const tasks = await prisma.task.findMany({
    where: { ...locationWhere, createdAt: { gte: since } },
    include: {
      location: true,
      assignee: true,
      assigner: true,
      completions: { orderBy: { completedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = tasks.map((t) => {
    const completion = t.completions[0];
    return [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      t.location.name,
      t.department ?? "",
      t.assignee?.name ?? "",
      t.assigner.name,
      t.priority,
      t.status,
      t.dueAt?.toISOString() ?? "",
      completion?.completedAt?.toISOString() ?? "",
      completion?.verifiedAt?.toISOString() ?? "",
      t.createdAt.toISOString(),
    ].join(",");
  });

  const header = "ID,Title,Location,Department,Assignee,AssignedBy,Priority,Status,DueAt,CompletedAt,VerifiedAt,CreatedAt";
  return [header, ...rows].join("\n");
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function buildMaintenanceCsv(scope: ScopeUser) {
  const locationWhere = await locationScopeWhere(scope);
  const reqs = await prisma.maintenanceRequest.findMany({
    where: locationWhere,
    include: {
      location: { select: { name: true } },
      reportedBy: { select: { name: true } },
      assignedTo: { select: { name: true } },
      resolvedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const header = "ID,Title,Area,Priority,Status,Location,ReportedBy,AssignedTo,Vendor,Cost,ResolutionNote,ReportedAt,ResolvedAt";
  const rows = reqs.map((r) =>
    [
      r.id, r.title, r.area, r.priority, r.status, r.location.name,
      r.reportedBy.name, r.assignedTo?.name ?? "", r.vendor ?? "",
      r.cost ?? "", r.resolutionNote ?? "",
      r.createdAt.toISOString(), r.resolvedAt?.toISOString() ?? "",
    ].map(csvCell).join(","),
  );
  return [header, ...rows].join("\n");
}

export async function buildInventoryCsv(scope: ScopeUser) {
  const locationWhere = await locationScopeWhere(scope);
  const items = await prisma.inventoryItem.findMany({
    where: { ...locationWhere, active: true },
    include: { location: { select: { name: true } } },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const header = "ID,Name,SKU,Category,Unit,Location,CurrentQty,ParLevel,ReorderLevel,LowStock";
  const rows = items.map((i) =>
    [
      i.id, i.name, i.sku ?? "", i.category ?? "", i.unit, i.location.name,
      i.currentQty, i.parLevel ?? "", i.reorderLevel ?? "",
      i.reorderLevel != null && i.currentQty <= i.reorderLevel ? "YES" : "",
    ].map(csvCell).join(","),
  );
  return [header, ...rows].join("\n");
}

// ── Daily Digest ──────────────────────────────────────────────────────────────

export async function buildDigestSummary() {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const [allTasks, locations, todayActivity] = await Promise.all([
    prisma.task.findMany({ select: { status: true, dueAt: true, locationId: true } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
    prisma.activityLog.findMany({
      where: { timestamp: { gte: todayStart } },
      select: { action: true, locationId: true },
    }),
  ]);

  const totalTasks = allTasks.length;
  const done = allTasks.filter((t) => t.status === "DONE" || t.status === "VERIFIED").length;
  const overdue = allTasks.filter((t) => isOverdue(t.dueAt, t.status) || t.status === "OVERDUE").length;
  const completedToday = todayActivity.filter((a) => a.action === "task.status_changed" || a.action === "task.verified").length;

  const byLocation = locations.map((loc) => {
    const locTasks = allTasks.filter((t) => t.locationId === loc.id);
    const locDone = locTasks.filter((t) => t.status === "DONE" || t.status === "VERIFIED").length;
    const locOverdue = locTasks.filter((t) => isOverdue(t.dueAt, t.status) || t.status === "OVERDUE").length;
    const rate = locTasks.length === 0 ? null : Math.round((locDone / locTasks.length) * 100);
    return { name: loc.name, total: locTasks.length, done: locDone, overdue: locOverdue, rate };
  });

  const best = [...byLocation].sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))[0];
  const worst = [...byLocation].sort((a, b) => (a.rate ?? 100) - (b.rate ?? 100))[0];

  const overallRate = totalTasks === 0 ? 0 : Math.round((done / totalTasks) * 100);
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const body = [
    `Overall: ${overallRate}% completion (${done}/${totalTasks} tasks).`,
    overdue > 0 ? `${overdue} task(s) overdue.` : "No overdue tasks.",
    `${completedToday} task(s) completed today.`,
    best ? `Top location: ${best.name} (${best.rate}%).` : "",
    worst && worst.name !== best?.name ? `Needs attention: ${worst.name} (${worst.rate ?? 0}%).` : "",
  ].filter(Boolean).join(" ");

  return { title: `Daily Digest — ${dateStr}`, body, overallRate, overdue, completedToday };
}
