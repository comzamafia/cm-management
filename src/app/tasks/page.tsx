import Link from "next/link";
import { TaskStatus } from "@prisma/client";
import { getCurrentUser, isManager } from "@/lib/auth";
import { getTasks } from "@/lib/queries";
import { STATUS_LABEL, formatDateTime } from "@/lib/labels";
import { StatusBadge, PriorityBadge } from "@/components/Badge";

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
  searchParams: Promise<{ status?: string; locationId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="text-slate-600">Select a user from the top-right switcher.</div>;
  }

  const params = await searchParams;
  const status = STATUS_FILTERS.includes(params.status as TaskStatus)
    ? (params.status as TaskStatus)
    : undefined;

  const tasks = await getTasks(user, {
    status,
    locationId: params.locationId,
  });

  const canCreate = isManager(user.role) || user.role === "SHIFT_LEAD";
  const qs = (s: string) => {
    const p = new URLSearchParams();
    if (s !== "ALL") p.set("status", s);
    if (params.locationId) p.set("locationId", params.locationId);
    const str = p.toString();
    return str ? `/tasks?${str}` : "/tasks";
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
        {canCreate && (
          <Link
            href="/tasks/new"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            + New Task
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => {
          const active = (s === "ALL" && !status) || s === status;
          return (
            <Link
              key={s}
              href={qs(s)}
              className={`rounded-full px-3 py-1 text-sm ring-1 ring-inset ${
                active
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {s === "ALL" ? "All" : STATUS_LABEL[s]}
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Task</th>
              <th className="px-4 py-2.5">Location</th>
              <th className="px-4 py-2.5">Assignee</th>
              <th className="px-4 py-2.5">Priority</th>
              <th className="px-4 py-2.5">Due</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/tasks/${t.id}`} className="font-medium text-slate-800 hover:underline">
                    {t.title}
                  </Link>
                  {t.proofRequired && (
                    <span className="ml-2 text-xs text-amber-600" title="Photo proof required">
                      📷
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{t.location.name}</td>
                <td className="px-4 py-3 text-slate-600">{t.assignee?.name ?? "—"}</td>
                <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                <td className="px-4 py-3 text-slate-600">{formatDateTime(t.dueAt)}</td>
                <td className="px-4 py-3"><StatusBadge status={t.derivedStatus} /></td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No tasks match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
