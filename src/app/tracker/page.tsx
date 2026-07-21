import { getCurrentUser } from "@/lib/auth";
import { getUserTaskTracker } from "@/lib/queries";
import { ROLE_LABEL } from "@/lib/labels";
import { APP_TZ } from "@/lib/time";
import { TrackerPrintButton } from "@/components/TrackerPrintButton";

export const dynamic = "force-dynamic";

// Per-person, read-only task tracker. Every user gets a menu item labeled with
// their own name (see Sidebar) that lands here; it rolls up the same task
// summary shown on the Dashboard into the Marketing/Operations tracker layout.
export default async function TrackerPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="m-card p-8 text-center text-[#726973]">Sign in to view your tracker.</div>;
  }

  const t = await getUserTaskTracker(user.id);
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: APP_TZ });

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header card */}
      <div className="m-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#F4A626]">Task Tracker</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#140516]">{user.name}&apos;s Tracker</h1>
            <p className="mt-0.5 text-sm text-[#726973]">
              {ROLE_LABEL[user.role]}{user.location ? ` · ${user.location.name}` : ""} · Today: {today}
            </p>
          </div>
          <div className="min-w-[220px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#726973]">Overall Completion</span>
              <span className="text-2xl font-extrabold text-[#440E48]">{t.overallPct}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#EEEAEE]">
              <div className="h-full rounded-full bg-[#440E48]" style={{ width: `${t.overallPct}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#e2445c]">{t.counts.overdue} overdue task{t.counts.overdue === 1 ? "" : "s"}</span>
              <TrackerPrintButton />
            </div>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile value={t.counts.done} label="Completed" color="#1DBA87" />
        <StatTile value={t.counts.total} label="Total Items" color="#440E48" />
        <StatTile value={t.counts.overdue} label="Overdue" color="#e2445c" />
        <StatTile value={t.counts.dueToday} label="Due Today" color="#F4A626" />
      </div>

      {/* KPI tables */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* KPI by Category */}
        <section className="m-card p-5">
          <h2 className="mb-3 text-base font-bold text-[#140516]">KPI by Category</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">
              <tr className="border-b border-[#eee]">
                <th className="py-2">Category</th>
                <th className="py-2 w-16 text-right">Total</th>
                <th className="py-2 w-16 text-right">Done</th>
                <th className="py-2 w-16 text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3eef3]">
              {t.byCategory.map((c) => (
                <tr key={c.name}>
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-2 font-medium text-[#140516]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </span>
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-[#726973]">{c.total}</td>
                  <td className="py-2.5 text-right tabular-nums text-[#726973]">{c.done}</td>
                  <td className="py-2.5 text-right"><PctBadge pct={c.pct} /></td>
                </tr>
              ))}
              {t.byCategory.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-sm text-[#A19BA2]">No tasks assigned.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Location Completion */}
        <section className="m-card p-5">
          <h2 className="mb-3 text-base font-bold text-[#140516]">Location Completion</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">
              <tr className="border-b border-[#eee]">
                <th className="py-2">Location</th>
                <th className="py-2 w-40 text-right">Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3eef3]">
              {t.byLocation.map((l) => (
                <tr key={l.name}>
                  <td className="py-2.5 font-medium text-[#140516]">{l.name}</td>
                  <td className="py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#EEEAEE]">
                        <div className="h-full rounded-full bg-[#1DBA87]" style={{ width: `${l.pct}%` }} />
                      </div>
                      <PctBadge pct={l.pct} />
                    </div>
                  </td>
                </tr>
              ))}
              {t.byLocation.length === 0 && (
                <tr><td colSpan={2} className="py-6 text-center text-sm text-[#A19BA2]">No tasks assigned.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function StatTile({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="m-card relative overflow-hidden p-5">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
      <div className="text-3xl font-extrabold" style={{ color }}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-[#726973]">{label}</div>
    </div>
  );
}

function PctBadge({ pct }: { pct: number }) {
  const style =
    pct >= 80 ? "bg-[#1DBA871a] text-[#1DBA87]" :
    pct >= 40 ? "bg-[#F4A6261a] text-[#B45309]" :
    "bg-[#e2445c1a] text-[#e2445c]";
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold ${style}`}>{pct}%</span>;
}
