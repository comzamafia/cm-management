import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { formatDateTime } from "@/lib/labels";

const ACTION_VERB: Record<string, string> = {
  "task.created": "created",
  "task.assigned": "assigned",
  "task.status_changed": "updated",
  "task.verified": "verified",
};

function rateColor(rate: number | null): string {
  if (rate === null) return "text-slate-400";
  if (rate >= 90) return "text-emerald-600";
  if (rate >= 80) return "text-amber-600";
  return "text-red-600";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">
        Select a user from the top-right switcher to begin.
      </div>
    );
  }

  const { byLocation, overdueTasks, activity, totals } = await getDashboardData(user);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Company Overview</h1>
          <p className="text-sm text-slate-500">Who · What · Where · When — across your locations.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/reports?period=weekly" className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
            ↓ Weekly CSV
          </a>
          <a href="/api/reports?period=monthly" className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
            ↓ Monthly CSV
          </a>
        </div>
      </div>

      {/* Drill-down navigation */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/dashboard/who",  emoji: "👤", label: "WHO",  desc: "People & on-time rates" },
          { href: "/dashboard/what", emoji: "📋", label: "WHAT", desc: "By department" },
          { href: "/dashboard/when", emoji: "📅", label: "WHEN", desc: "14-day trend" },
        ].map((d) => (
          <Link key={d.href} href={d.href} className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400 hover:shadow-sm transition-all">
            <div className="text-lg">{d.emoji}</div>
            <div className="mt-1 font-semibold text-slate-800">{d.label}</div>
            <div className="text-xs text-slate-400">{d.desc}</div>
          </Link>
        ))}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-lg">📍</div>
          <div className="mt-1 font-semibold text-slate-500">WHERE</div>
          <div className="text-xs text-slate-400">Click a location below</div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Total" value={totals.total} />
        <Kpi label="Pending" value={totals.pending} />
        <Kpi label="In Progress" value={totals.inProgress} accent="text-blue-600" />
        <Kpi label="Done" value={totals.done} accent="text-emerald-600" />
        <Kpi label="Verified" value={totals.verified} accent="text-violet-600" />
        <Kpi label="Overdue" value={totals.overdue} accent="text-red-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Completion by location — WHERE */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Completion by Location
          </h2>
          <div className="space-y-3">
            {byLocation.map((l) => (
              <div key={l.location.id} className="flex items-center gap-3">
                <Link href={`/dashboard/where/${l.location.id}`} className="w-28 truncate text-sm font-medium text-slate-700 hover:underline">
                  {l.location.name}
                </Link>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${l.rate ?? 0}%` }}
                  />
                </div>
                <span className={`w-16 text-right text-sm font-semibold ${rateColor(l.rate)}`}>
                  {l.rate === null ? "—" : `${l.rate}%`}
                </span>
                {l.overdue > 0 && (
                  <span className="w-20 text-right text-xs font-medium text-red-600">
                    {l.overdue} overdue
                  </span>
                )}
              </div>
            ))}
            {byLocation.length === 0 && <Empty>No locations in scope.</Empty>}
          </div>
        </section>

        {/* Overdue counter — WHAT is stuck, WHERE, how long */}
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Overdue Tasks
          </h2>
          <div className="space-y-2">
            {overdueTasks.slice(0, 6).map((t) => {
              const days = t.dueAt ? Math.floor((Date.now() - t.dueAt.getTime()) / 86400000) : 0;
              return (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 hover:bg-red-100"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800">{t.title}</div>
                    <div className="text-xs text-slate-500">
                      {t.location.name}
                      {t.assignee ? ` · ${t.assignee.name}` : " · unassigned"}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-red-700">
                    {days > 0 ? `${days}d late` : "due today"}
                  </span>
                </Link>
              );
            })}
            {overdueTasks.length === 0 && <Empty>Nothing overdue. 🎉</Empty>}
          </div>
        </section>
      </div>

      {/* Live activity feed — WHO did WHAT, WHERE, WHEN */}
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Live Activity Feed
        </h2>
        <ul className="divide-y divide-slate-100">
          {activity.map((a) => {
            const meta = a.meta as { title?: string; to?: string };
            return (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-slate-700">
                  <span className="font-medium">{a.user.name}</span>{" "}
                  {ACTION_VERB[a.action] ?? a.action}{" "}
                  {meta.title ? <span className="font-medium">“{meta.title}”</span> : a.entity}
                  {a.location ? <span className="text-slate-400"> @ {a.location.name}</span> : null}
                  {meta.to ? <span className="text-slate-400"> → {meta.to}</span> : null}
                </span>
                <span className="shrink-0 text-xs text-slate-400">{formatDateTime(a.timestamp)}</span>
              </li>
            );
          })}
          {activity.length === 0 && <Empty>No recent activity.</Empty>}
        </ul>
      </section>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className={`text-2xl font-semibold ${accent ?? "text-slate-900"}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-3 text-sm text-slate-400">{children}</div>;
}
