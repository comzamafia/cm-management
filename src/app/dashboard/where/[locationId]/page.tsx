import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, isManager } from "@/lib/auth";
import { getLocationDetail } from "@/lib/reports";
import { ROLE_LABEL, formatDateTime } from "@/lib/labels";
import { StatusBadge, PriorityBadge } from "@/components/Badge";

export default async function WhereLocationPage({ params }: { params: Promise<{ locationId: string }> }) {
  const [user, { locationId }] = await Promise.all([getCurrentUser(), params]);

  if (!user || !isManager(user.role)) {
    return <div className="text-slate-600">Manager access required.</div>;
  }

  const data = await getLocationDetail(locationId, user);
  if (!data) notFound();

  const { location, tasks, todaysTasks, overdueList, team, rate, companyAvg, allLocations } = data;

  const rateColor = rate === null ? "text-slate-400" : rate >= 90 ? "text-emerald-600" : rate >= 70 ? "text-amber-600" : "text-red-600";
  const vsAvg = rate !== null && companyAvg !== null ? rate - companyAvg : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <span>/</span>
        <span className="text-slate-400">WHERE</span>
        <span>/</span>
        <span className="font-medium text-slate-900">{location.name}</span>
      </div>

      {/* Other locations quick-switch */}
      <div className="flex flex-wrap gap-2">
        {allLocations.map((l) => (
          <Link
            key={l.id}
            href={`/dashboard/where/${l.id}`}
            className={`rounded-full px-3 py-1 text-sm ring-1 ring-inset ${
              l.id === locationId
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {l.name}
          </Link>
        ))}
      </div>

      {/* Header card */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{location.name}</h1>
            {location.address && <p className="text-sm text-slate-500">{location.address}</p>}
            {location.managedBy && (
              <p className="text-sm text-slate-500">
                Manager: <Link href={`/dashboard/who/${location.managedBy.id}`} className="text-blue-600 hover:underline">{location.managedBy.name}</Link>
              </p>
            )}
          </div>
          <div className="flex gap-6 text-center">
            <Stat label="Total Tasks" value={tasks.length} />
            <Stat label="Completion" value={rate === null ? "—" : `${rate}%`} color={rateColor} />
            <Stat label="Overdue" value={overdueList.length} color={overdueList.length > 0 ? "text-red-600" : undefined} />
            <Stat
              label="vs Company Avg"
              value={vsAvg === null ? "—" : vsAvg >= 0 ? `+${vsAvg}%` : `${vsAvg}%`}
              color={vsAvg === null ? undefined : vsAvg >= 0 ? "text-emerald-600" : "text-red-600"}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's tasks */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Today's Tasks ({todaysTasks.length})
          </h2>
          <ul className="space-y-2">
            {todaysTasks.slice(0, 8).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <Link href={`/tasks/${t.id}`} className="truncate text-sm text-slate-700 hover:underline">{t.title}</Link>
                <StatusBadge status={t.derivedStatus} />
              </li>
            ))}
            {todaysTasks.length === 0 && <li className="text-sm text-slate-400">No tasks created today.</li>}
          </ul>
        </section>

        {/* Overdue tasks */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Overdue ({overdueList.length})
          </h2>
          <ul className="space-y-2">
            {overdueList.slice(0, 8).map((t) => {
              const days = t.dueAt ? Math.floor((Date.now() - t.dueAt.getTime()) / 86400000) : 0;
              return (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/tasks/${t.id}`} className="truncate text-sm font-medium text-slate-800 hover:underline">{t.title}</Link>
                    <div className="text-xs text-slate-400">{t.assignee?.name ?? "Unassigned"}</div>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-red-600">{days > 0 ? `${days}d late` : "today"}</span>
                </li>
              );
            })}
            {overdueList.length === 0 && <li className="text-sm text-slate-400">No overdue tasks. ✓</li>}
          </ul>
        </section>

        {/* Team */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Team ({team.length})</h2>
          <ul className="space-y-2">
            {team.map((u) => (
              <li key={u.id} className="flex items-center justify-between">
                <Link href={`/dashboard/who/${u.id}`} className="text-sm text-slate-700 hover:underline">{u.name}</Link>
                <span className="text-xs text-slate-400">{ROLE_LABEL[u.role]}</span>
              </li>
            ))}
            {team.length === 0 && <li className="text-sm text-slate-400">No active staff assigned.</li>}
          </ul>
        </section>

        {/* All tasks table */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">All Tasks</h2>
          <ul className="divide-y divide-slate-100">
            {tasks.slice(0, 8).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                <Link href={`/tasks/${t.id}`} className="truncate text-sm text-slate-700 hover:underline">{t.title}</Link>
                <div className="flex shrink-0 gap-1.5">
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.derivedStatus} />
                </div>
              </li>
            ))}
          </ul>
          {tasks.length > 8 && (
            <Link href={`/tasks?locationId=${locationId}`} className="mt-2 block text-xs text-blue-600 hover:underline">
              View all {tasks.length} tasks →
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-semibold ${color ?? "text-slate-900"}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
