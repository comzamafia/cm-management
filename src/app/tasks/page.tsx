import Link from "next/link";
import { Suspense } from "react";
import { Priority, TaskStatus } from "@prisma/client";
import { getCurrentUser, isManager, locationScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTasks } from "@/lib/queries";
import { STATUS_LABEL } from "@/lib/labels";
import { TaskSearchBar } from "@/components/TaskSearchBar";
import { TaskFilters } from "@/components/TaskFilters";
import { TaskTable, type TaskRow } from "@/components/TaskTable";

const STATUS_FILTERS: (TaskStatus | "ALL")[] = [
  "ALL",
  "PENDING",
  "IN_PROGRESS",
  "DONE",
  "VERIFIED",
  "OVERDUE",
];

const PRIORITY_ORDER: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
// Default list order: open work first, completed/verified history last — Prisma's
// alphabetical status sort (DONE < OVERDUE < PENDING) buries new tasks otherwise.
const STATUS_RANK: Record<TaskStatus, number> = { PENDING: 0, IN_PROGRESS: 1, OVERDUE: 2, DONE: 3, VERIFIED: 4 };
const VALID_SORTS = ["title", "priority", "due"] as const;
type SortCol = (typeof VALID_SORTS)[number];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    locationId?: string;
    q?: string;
    mine?: string;
    assigneeId?: string;
    priority?: string;
    categoryId?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="text-[#726973]">Sign in to view tasks.</div>;
  }

  const params = await searchParams;
  const status = STATUS_FILTERS.includes(params.status as TaskStatus)
    ? (params.status as TaskStatus)
    : undefined;
  const q = params.q?.trim() || undefined;
  const priority = (Object.values(Priority) as string[]).includes(params.priority ?? "")
    ? (params.priority as Priority)
    : undefined;
  const sort: SortCol | undefined = VALID_SORTS.includes(params.sort as SortCol)
    ? (params.sort as SortCol)
    : undefined;
  const sortDir: "asc" | "desc" = params.dir === "desc" ? "desc" : "asc";

  const isEmployeeRole = user.role === "EMPLOYEE" || user.role === "NEW_HIRE";
  const assigneeId = isEmployeeRole
    ? user.id
    : params.mine === "1"
    ? user.id
    : params.assigneeId || undefined;
  const categoryId = params.categoryId || undefined;

  // Fetch all tasks matching scope+filters (no status filter) — we filter/count in JS.
  const allTasks = await getTasks(user, {
    locationId: params.locationId,
    assigneeId,
    priority,
    categoryId,
    q,
  });

  // Count by derived status for the pill badges.
  const statusCounts: Partial<Record<TaskStatus | "ALL", number>> = { ALL: allTasks.length };
  for (const t of allTasks) {
    statusCounts[t.derivedStatus] = (statusCounts[t.derivedStatus] ?? 0) + 1;
  }

  // Apply optional column sort.
  const sorted = sort
    ? [...allTasks].sort((a, b) => {
        const m = sortDir === "desc" ? -1 : 1;
        if (sort === "title") return m * a.title.localeCompare(b.title);
        if (sort === "priority")
          return m * ((PRIORITY_ORDER[a.priority] ?? 0) - (PRIORITY_ORDER[b.priority] ?? 0));
        if (sort === "due") {
          if (!a.dueAt && !b.dueAt) return 0;
          if (!a.dueAt) return m;
          if (!b.dueAt) return -m;
          return m * (a.dueAt.getTime() - b.dueAt.getTime());
        }
        return 0;
      })
    : // Default order: Prisma sorts status alphabetically (DONE < OVERDUE < PENDING),
      // which buries fresh PENDING tasks under months of completed/overdue history on
      // a busy board. Surface open work first instead.
      [...allTasks].sort((a, b) => {
        const rank = STATUS_RANK[a.derivedStatus] - STATUS_RANK[b.derivedStatus];
        if (rank !== 0) return rank;
        if (!a.dueAt && !b.dueAt) return b.createdAt.getTime() - a.createdAt.getTime();
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;
        return a.dueAt.getTime() - b.dueAt.getTime();
      });

  const tasks = status ? sorted.filter((t) => t.derivedStatus === status) : sorted;

  const rows: TaskRow[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    locationName: t.location.name,
    assigneeName: t.assignee?.name ?? null,
    priority: t.priority,
    derivedStatus: t.derivedStatus,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    proofRequired: t.proofRequired,
  }));

  const canCreate = isManager(user.role) || user.role === "SHIFT_LEAD" || !!user.locationId;
  const canManage = isManager(user.role);

  const scope = await locationScopeWhere(user);
  const [assignees, categories] = await Promise.all([
    canManage
      ? prisma.user.findMany({
          where: { ...scope, status: "ACTIVE" },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    prisma.category.findMany({
      where: scope.locationId
        ? { OR: [{ locationId: { in: scope.locationId.in } }, { locationId: null }] }
        : {},
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  // Build URL for status pill links, preserving all other active filters.
  const qs = (s: string) => {
    const p = new URLSearchParams();
    if (s !== "ALL") p.set("status", s);
    if (params.locationId) p.set("locationId", params.locationId);
    if (q) p.set("q", q);
    if (params.mine === "1") p.set("mine", "1");
    if (params.assigneeId) p.set("assigneeId", params.assigneeId);
    if (params.priority) p.set("priority", params.priority);
    if (params.categoryId) p.set("categoryId", params.categoryId);
    if (sort) { p.set("sort", sort); if (sortDir === "desc") p.set("dir", "desc"); }
    const str = p.toString();
    return str ? `/tasks?${str}` : "/tasks";
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">
            {isEmployeeRole ? "My Tasks" : "Tasks"}
          </h1>
          <p className="mt-0.5 text-sm text-[#726973]">
            {tasks.length} item{tasks.length === 1 ? "" : "s"} in view
          </p>
        </div>
        {canCreate && (
          <Link href="/tasks/new" className="m-btn">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Task
          </Link>
        )}
      </div>

      {/* Search + filters + status pills */}
      <div className="space-y-3">
        <Suspense>
          <TaskSearchBar defaultValue={q ?? ""} />
        </Suspense>
        <Suspense>
          <TaskFilters
            assignees={assignees}
            categories={categories}
            showAssignee={canManage}
            showMine={!isEmployeeRole}
          />
        </Suspense>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => {
            const active = (s === "ALL" && !status) || s === status;
            const count = statusCounts[s] ?? 0;
            return (
              <Link
                key={s}
                href={qs(s)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#440E48] text-white shadow-sm"
                    : "bg-white text-[#726973] ring-1 ring-inset ring-[#E4DDE4] hover:bg-[#F0EBF0]"
                }`}
              >
                {s === "ALL" ? "All" : STATUS_LABEL[s]}
                {" "}
                <span className={active ? "text-white/70" : "text-[#A19BA2]"}>
                  ({count})
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <TaskTable
        tasks={rows}
        canManage={canManage}
        assignees={assignees}
        sort={sort}
        sortDir={sortDir}
        emptyMessage={q ? `No tasks matching "${q}".` : "No tasks match this filter."}
      />
    </div>
  );
}
