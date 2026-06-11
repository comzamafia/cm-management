import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { getOpenMaintenanceCount } from "@/lib/maintenance";
import { getLowStockCount } from "@/lib/inventory";
import { formatDateTime } from "@/lib/labels";

const ACTION_VERB: Record<string, string> = {
  "task.created": "created",
  "task.assigned": "assigned",
  "task.status_changed": "updated",
  "task.verified": "verified",
};

function rateColor(rate: number | null): string {
  if (rate === null) return "text-[#9699a6]";
  if (rate >= 90) return "text-[#00c875]";
  if (rate >= 80) return "text-[#fdab3d]";
  return "text-[#e2445c]";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="m-card p-8 text-center text-[#676879]">
        Sign in to view your workspace.
      </div>
    );
  }

  const { byLocation, overdueTasks, activity, totals } = await getDashboardData(user);
  const [openMaintenance, lowStock] = await Promise.all([
    getOpenMaintenanceCount(),
    getLowStockCount(),
  ]);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#323338]">Company Overview</h1>
          <p className="mt-0.5 text-sm text-[#676879]">Track people, departments, and trends across your locations.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/reports?period=weekly" className="m-btn-ghost">
            ↓ Weekly CSV
          </a>
          <a href="/api/reports?period=monthly" className="m-btn-ghost">
            ↓ Monthly CSV
          </a>
        </div>
      </div>

      {/* Drill-down navigation */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/dashboard/who",  emoji: "👤", label: "People",      desc: "People & on-time rates", color: "#0073ea" },
          { href: "/dashboard/what", emoji: "📋", label: "Departments", desc: "By department", color: "#a25ddc" },
          { href: "/dashboard/when", emoji: "📅", label: "Trends",      desc: "14-day trend", color: "#00c875" },
        ].map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="m-card group flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl"
              style={{ backgroundColor: `${d.color}1a` }}
            >
              {d.emoji}
            </span>
            <div className="min-w-0">
              <div className="font-bold text-[#323338]" style={{ color: d.color }}>{d.label}</div>
              <div className="truncate text-xs text-[#676879]">{d.desc}</div>
            </div>
          </Link>
        ))}
        <div className="m-card flex items-center gap-3 p-4 opacity-80">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#fdab3d1a] text-xl">📍</span>
          <div className="min-w-0">
            <div className="font-bold text-[#fdab3d]">Locations</div>
            <div className="truncate text-xs text-[#676879]">Pick a location below</div>
          </div>
        </div>
      </div>

      {/* Operations tiles — Maintenance + Inventory */}
      <div className="grid grid-cols-2 gap-3">
        <OpsTile href="/maintenance" emoji="🔧" label="Open Maintenance" count={openMaintenance} accent="#9F4000" />
        <OpsTile href="/inventory" emoji="📦" label="Low-stock Items" count={lowStock} accent="#e2445c" />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Total" value={totals.total} color="#323338" />
        <Kpi label="Pending" value={totals.pending} color="#9699a6" />
        <Kpi label="In Progress" value={totals.inProgress} color="#fdab3d" />
        <Kpi label="Done" value={totals.done} color="#00c875" />
        <Kpi label="Verified" value={totals.verified} color="#a25ddc" />
        <Kpi label="Overdue" value={totals.overdue} color="#e2445c" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Completion by location — WHERE */}
        <section className="m-card p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#676879]">
            Completion by Location
          </h2>
          <div className="space-y-3.5">
            {byLocation.map((l) => (
              <div key={l.location.id} className="flex items-center gap-3">
                <Link href={`/dashboard/where/${l.location.id}`} className="w-28 truncate text-sm font-semibold text-[#323338] hover:text-[#0073ea]">
                  {l.location.name}
                </Link>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#eceef3]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${l.rate ?? 0}%`,
                      backgroundColor: (l.rate ?? 0) >= 90 ? "#00c875" : (l.rate ?? 0) >= 80 ? "#fdab3d" : "#e2445c",
                    }}
                  />
                </div>
                <span className={`w-14 text-right text-sm font-bold ${rateColor(l.rate)}`}>
                  {l.rate === null ? "—" : `${l.rate}%`}
                </span>
                {l.overdue > 0 && (
                  <span className="m-pill bg-[#e2445c] !px-2 !py-0.5 text-[11px]">
                    {l.overdue}
                  </span>
                )}
              </div>
            ))}
            {byLocation.length === 0 && <Empty>No locations in scope.</Empty>}
          </div>
        </section>

        {/* Overdue counter */}
        <section className="m-card p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#676879]">
            Overdue Tasks
          </h2>
          <div className="space-y-2">
            {overdueTasks.slice(0, 6).map((t) => {
              const days = t.dueAt ? Math.floor((Date.now() - t.dueAt.getTime()) / 86400000) : 0;
              return (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className="flex items-center justify-between gap-2 overflow-hidden rounded-lg border border-[#f3d3d8] bg-[#fdf2f3] px-3 py-2.5 transition-colors hover:bg-[#fbe6e9]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="h-8 w-1.5 shrink-0 rounded-full bg-[#e2445c]" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#323338]">{t.title}</div>
                      <div className="text-xs text-[#676879]">
                        {t.location.name}
                        {t.assignee ? ` · ${t.assignee.name}` : " · unassigned"}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-[#e2445c]">
                    {days > 0 ? `${days}d late` : "due today"}
                  </span>
                </Link>
              );
            })}
            {overdueTasks.length === 0 && <Empty>Nothing overdue. 🎉</Empty>}
          </div>
        </section>
      </div>

      {/* Live activity feed */}
      <section className="m-card p-5">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#676879]">
          Live Activity Feed
        </h2>
        <ul className="divide-y divide-[#eceef3]">
          {activity.map((a) => {
            const meta = a.meta as { title?: string; to?: string };
            return (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-[#50515c]">
                  <span className="font-semibold text-[#323338]">{a.user.name}</span>{" "}
                  {ACTION_VERB[a.action] ?? a.action}{" "}
                  {meta.title ? <span className="font-semibold text-[#323338]">“{meta.title}”</span> : a.entity}
                  {a.location ? <span className="text-[#9699a6]"> @ {a.location.name}</span> : null}
                  {meta.to ? <span className="text-[#9699a6]"> → {meta.to}</span> : null}
                </span>
                <span className="shrink-0 text-xs text-[#9699a6]">{formatDateTime(a.timestamp)}</span>
              </li>
            );
          })}
          {activity.length === 0 && <Empty>No recent activity.</Empty>}
        </ul>
      </section>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="m-card relative overflow-hidden p-4">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
      <div className="text-3xl font-extrabold" style={{ color }}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-[#676879]">{label}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-3 text-sm text-[#9699a6]">{children}</div>;
}

function OpsTile({
  href,
  emoji,
  label,
  count,
  accent,
}: {
  href: string;
  emoji: string;
  label: string;
  count: number;
  accent: string;
}) {
  const active = count > 0;
  return (
    <Link
      href={href}
      className="m-card group flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl"
        style={{ backgroundColor: `${accent}1a` }}
      >
        {emoji}
      </span>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold" style={{ color: active ? accent : "#9699a6" }}>
          {count}
        </div>
        <div className="truncate text-xs font-medium text-[#676879]">{label}</div>
      </div>
    </Link>
  );
}
