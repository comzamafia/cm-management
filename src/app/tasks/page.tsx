import Link from "next/link";
import { Suspense } from "react";
import { TaskStatus } from "@prisma/client";
import { getCurrentUser, isManager } from "@/lib/auth";
import { getTasks } from "@/lib/queries";
import { STATUS_LABEL, formatDateTime } from "@/lib/labels";
import { StatusBadge, PriorityBadge } from "@/components/Badge";
import { TaskSearchBar } from "@/components/TaskSearchBar";
import { DeleteTaskButton } from "@/components/DeleteTaskButton";

const STATUS_FILTERS: (TaskStatus | "ALL")[] = [
  "ALL",
  "PENDING",
  "IN_PROGRESS",
  "DONE",
  "VERIFIED",
  "OVERDUE",
];

const STATUS_HEX: Record<TaskStatus, string> = {
  PENDING: "#A19BA2",
  IN_PROGRESS: "#F4A626",
  DONE: "#1DBA87",
  VERIFIED: "#440E48",
  OVERDUE: "#e2445c",
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; locationId?: string; q?: string }>;
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

  const tasks = await getTasks(user, {
    status,
    locationId: params.locationId,
    q,
  });

  const canCreate = isManager(user.role) || user.role === "SHIFT_LEAD";
  const canManage = isManager(user.role);
  const qs = (s: string) => {
    const p = new URLSearchParams();
    if (s !== "ALL") p.set("status", s);
    if (params.locationId) p.set("locationId", params.locationId);
    if (q) p.set("q", q);
    const str = p.toString();
    return str ? `/tasks?${str}` : "/tasks";
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">Tasks</h1>
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

      <div className="m-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-[#E4DDE4] bg-[#F9F6F9] text-left text-xs font-semibold uppercase tracking-wider text-[#726973]">
            <tr>
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Assignee</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Status</th>
              {canManage && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EBF0]">
            {tasks.map((t) => (
              <tr key={t.id} className="group transition-colors hover:bg-[#F9F6F9]">
                <td className="py-3 pl-0 pr-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-9 w-1.5 shrink-0 rounded-r"
                      style={{ backgroundColor: STATUS_HEX[t.derivedStatus] }}
                    />
                    <Link href={`/tasks/${t.id}`} className="font-semibold text-[#140516] group-hover:text-[#440E48]">
                      {t.title}
                    </Link>
                    {t.proofRequired && (
                      <span className="text-xs text-[#F4A626]" title="Photo proof required">📷</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-[#726973]">{t.location.name}</td>
                <td className="px-4 py-3 text-[#726973]">{t.assignee?.name ?? "—"}</td>
                <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                <td className="px-4 py-3 text-[#726973]">{formatDateTime(t.dueAt)}</td>
                <td className="px-4 py-3"><StatusBadge status={t.derivedStatus} /></td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/tasks/${t.id}`}
                        title="Open / edit"
                        className="rounded-lg p-1.5 text-[#A19BA2] transition hover:bg-[#F0EBF0] hover:text-[#440E48]"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </Link>
                      <DeleteTaskButton taskId={t.id} compact />
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={canManage ? 7 : 6} className="px-4 py-12 text-center text-[#A19BA2]">
                  {q ? `No tasks matching "${q}".` : "No tasks match this filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
