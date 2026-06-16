import Link from "next/link";
import { getCurrentUser, isManager } from "@/lib/auth";
import { getDailySummary } from "@/lib/reports";
import { formatDateTime } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function DailySummaryPage() {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to view reports.</div>;
  if (!isManager(user.role)) return <div className="text-[#726973]">Manager access required.</div>;

  const s = await getDailySummary(user);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">Daily Summary</h1>
          <p className="mt-0.5 text-sm text-[#726973]">{s.dateStr}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard" className="m-btn-ghost">← Dashboard</Link>
          <a href="/api/reports?period=weekly" className="m-btn-ghost">↓ Weekly CSV</a>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Completed today" value={s.completedToday} color="#1DBA87" />
        <Kpi label="Verified today" value={s.verifiedToday} color="#440E48" />
        <Kpi label="Created today" value={s.createdToday} color="#5B8DD9" />
        <Kpi label="In Progress" value={s.inProgress} color="#F4A626" />
        <Kpi label="Pending" value={s.pending} color="#A19BA2" />
        <Kpi label="Overdue" value={s.overdue} color="#e2445c" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Completions today */}
        <section className="m-card p-5 lg:col-span-2">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">Completed Today</h2>
          <ul className="divide-y divide-[#f3eef3]">
            {s.completions.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium text-[#140516]">{c.title}</div>
                  <div className="text-xs text-[#A19BA2]">{c.byName} · {c.locationName}{c.verified ? " · ✓ verified" : ""}</div>
                </div>
                <span className="shrink-0 text-xs text-[#A19BA2]">{formatDateTime(c.at)}</span>
              </li>
            ))}
            {s.completions.length === 0 && <li className="py-3 text-sm text-[#A19BA2]">Nothing completed yet today.</li>}
          </ul>
        </section>

        <div className="space-y-5">
          {/* By location */}
          <section className="m-card p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">Completions by Location</h2>
            <ul className="space-y-2">
              {s.byLocation.map((l) => (
                <li key={l.name} className="flex items-center justify-between text-sm">
                  <span className="truncate text-[#140516]">{l.name}</span>
                  <span className="font-bold text-[#726973]">{l.n}</span>
                </li>
              ))}
              {s.byLocation.length === 0 && <li className="text-sm text-[#A19BA2]">—</li>}
            </ul>
          </section>

          {/* Top performers */}
          <section className="m-card p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">Top Performers Today</h2>
            <ul className="space-y-2">
              {s.topPerformers.map((p, i) => (
                <li key={p.name} className="flex items-center justify-between text-sm">
                  <span className="truncate text-[#140516]">{i + 1}. {p.name}</span>
                  <span className="font-bold text-[#726973]">{p.n}</span>
                </li>
              ))}
              {s.topPerformers.length === 0 && <li className="text-sm text-[#A19BA2]">—</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="m-card relative overflow-hidden p-4">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
      <div className="text-3xl font-extrabold" style={{ color }}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-[#726973]">{label}</div>
    </div>
  );
}
