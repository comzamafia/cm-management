import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, isManager } from "@/lib/auth";
import { getUserProfile } from "@/lib/reports";
import { ROLE_LABEL, formatDateTime } from "@/lib/labels";
import { StatusBadge, PriorityBadge } from "@/components/Badge";

const ACTION_VERB: Record<string, string> = {
  "task.created": "created",
  "task.assigned": "assigned",
  "task.status_changed": "updated",
  "task.verified": "verified",
  "task.overdue": "overdue flagged",
};

export default async function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const [user, { userId }] = await Promise.all([getCurrentUser(), params]);

  if (!user || !isManager(user.role)) {
    return <div className="text-slate-600">Manager access required.</div>;
  }

  const profile = await getUserProfile(userId, user);
  if (!profile) notFound();

  const { user: subject, stats, recentTasks, activity } = profile;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/who" className="hover:underline">People</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{subject.name}</span>
      </div>

      {/* Profile card */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{subject.name}</h1>
            <p className="text-sm text-slate-500">{ROLE_LABEL[subject.role]} · {subject.location?.name ?? "No location"}</p>
            {subject.email && <p className="text-sm text-slate-400">{subject.email}</p>}
            {subject.phone && <p className="text-sm text-slate-400">{subject.phone}</p>}
          </div>
          <div className="flex gap-6 text-center">
            <Stat label="Assigned" value={stats.total} />
            <Stat label="Completed" value={stats.done} color="text-emerald-600" />
            <Stat label="Overdue" value={stats.overdue} color="text-red-600" />
            <Stat label="On-time Rate" value={stats.rate === null ? "—" : `${stats.rate}%`}
              color={stats.rate === null ? undefined : stats.rate >= 80 ? "text-emerald-600" : "text-red-600"} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent tasks */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Recent Tasks</h2>
          <ul className="space-y-2">
            {recentTasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <Link href={`/tasks/${t.id}`} className="truncate text-sm text-slate-700 hover:underline">
                  {t.title}
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.derivedStatus} />
                </div>
              </li>
            ))}
            {recentTasks.length === 0 && <li className="text-sm text-slate-400">No tasks assigned.</li>}
          </ul>
          {stats.total > 15 && (
            <Link href={`/tasks?assigneeId=${subject.id}`} className="mt-3 block text-xs text-blue-600 hover:underline">
              View all {stats.total} tasks →
            </Link>
          )}
        </section>

        {/* Activity history */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Activity</h2>
          <ul className="divide-y divide-slate-100">
            {activity.map((a) => {
              const meta = a.meta as { title?: string; to?: string };
              return (
                <li key={a.id} className="flex items-start justify-between gap-2 py-2 text-sm">
                  <span className="text-slate-700">
                    {ACTION_VERB[a.action] ?? a.action}
                    {meta.title ? <span className="font-medium"> "{meta.title}"</span> : null}
                    {a.location ? <span className="text-slate-400"> @ {a.location.name}</span> : null}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{formatDateTime(a.timestamp)}</span>
                </li>
              );
            })}
            {activity.length === 0 && <li className="py-2 text-sm text-slate-400">No recent activity.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div>
      <div className={`text-2xl font-semibold ${color ?? "text-slate-900"}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
