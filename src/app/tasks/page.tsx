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
  const isEmployeeRole = user.role === "EMPLOYEE" || user.role === "NEW_HIRE";
  // Employees always see only their own tasks; managers can toggle with ?mine=1.
  const assigneeId = isEmployeeRole
    ? user.id
    : params.mine === "1"
    ? user.id
    : params.assigneeId || undefined;
  const categoryId = params.categoryId || undefined;

  const tasks = await getTasks(user, {
    status,
    locationId: params.locationId,
    assigneeId,
    priority,
    categoryId,
    q,
  });

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

  // Everyone with a branch can add a personal task; managers/shift leads create for the team.
  const canCreate = isManager(user.role) || user.role === "SHIFT_LEAD" || !!user.locationId;
  const canManage = isManager(user.role);

  // Options for the filter dropdowns (scope-limited).
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
      where: scope.locationId ? { OR: [{ locationId: { in: scope.locationId.in } }, { locationId: null }] } : {},
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
  const qs = (s: string) => {
    const p = new URLSearchParams();
    if (s !== "ALL") p.set("status", s);
    if (params.locationId) p.set("locationId", params.locationId);
    if (q) p.set("q", q);
    if (params.mine === "1") p.set("mine", "1");
    if (params.assigneeId) p.set("assigneeId", params.assigneeId);
    if (params.priority) p.set("priority", params.priority);
    if (params.categoryId) p.set("categoryId", params.categoryId);
    const str = p.toString();
    return str ? `/tasks?${str}` : "/tasks";
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">{isEmployeeRole ? "My Tasks" : "Tasks"}</h1>
          <p className="mt-0.5 text-sm text-[#726973]">{tasks.length} item{tasks.length === 1 ? "" : "s"} in view</p>
        </div>
        {canCreate && (
          <Link href="/tasks/new" className="m-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Task
          </Link>
        )}
      </div>

      {/* Search + status filters */}
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
              </Link>
            );
          })}
        </div>
      </div>

      <TaskTable
        tasks={rows}
        canManage={canManage}
        assignees={assignees}
        emptyMessage={q ? `No tasks matching "${q}".` : "No tasks match this filter."}
      />
    </div>
  );
}
