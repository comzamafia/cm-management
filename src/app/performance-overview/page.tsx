import Link from "next/link";
import { redirect } from "next/navigation";
import { Role, LogCategory, RiskLevel } from "@prisma/client";
import { getCurrentUser, atLeast } from "@/lib/auth";
import { getLogbookLocations } from "@/lib/logbook";
import { getPerformanceOverview } from "@/lib/performance-overview";
import { formatDateTime } from "@/lib/labels";
import { PerformanceFilters } from "@/components/PerformanceFilters";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<LogCategory, string> = {
  OPERATIONS: "Operations",
  SALES_METRICS: "Sales metrics",
  CUSTOMER_COMPLAINT: "Customer complaint",
  ACTION_NEEDED: "Action needed",
};
const RISK_STYLE: Record<RiskLevel, string> = {
  LOW: "bg-[#1DBA871a] text-[#1DBA87]",
  MEDIUM: "bg-[#F4A6261a] text-[#B45309]",
  HIGH: "bg-[#e2445c1a] text-[#e2445c]",
};
function riskColor(v: number) {
  return v >= 75 ? "#e2445c" : v >= 45 ? "#F4A626" : "#1DBA87";
}

type SP = Promise<{ from?: string; to?: string; locationId?: string; category?: string }>;

export default async function PerformanceOverviewPage({ searchParams }: { searchParams: SP }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!atLeast(user.role, Role.STORE_MANAGER)) redirect("/logbook");

  const sp = await searchParams;
  const category = (["OPERATIONS", "SALES_METRICS", "CUSTOMER_COMPLAINT", "ACTION_NEEDED"] as const).includes(sp.category as LogCategory)
    ? (sp.category as LogCategory)
    : undefined;

  const [data, locations] = await Promise.all([
    getPerformanceOverview({ from: sp.from, to: sp.to, locationId: sp.locationId, category }),
    getLogbookLocations(),
  ]);
  if (!data) redirect("/login");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#F4A626]">Operations Tracker</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-[#140516]">Performance overview</h1>
          <p className="mt-0.5 text-sm text-[#726973]">{data.period.from} → {data.period.to} · powered by your logbook</p>
        </div>
        <Link href="/logbook" className="m-btn-ghost">Open logbook →</Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label="Logbook records" value={data.kpi.records} color="#440E48" sub="in this period" />
        <Kpi label="Analyzed records" value={data.kpi.analyzed} color="#5B8DD9" sub="AI risk scored" />
        <Kpi label="Average risk" value={data.kpi.avgRisk} color={riskColor(data.kpi.avgRisk)} sub="out of 100" />
        <Kpi label="High risk" value={data.kpi.highRisk} color="#e2445c" sub="flagged entries" />
        <Kpi label="Follow-ups" value={data.kpi.followUps} color="#F4A626" sub="need attention" />
      </div>

      <PerformanceFilters
        locations={locations}
        from={sp.from ?? data.period.from}
        to={sp.to ?? data.period.to}
        locationId={sp.locationId ?? ""}
        category={category ?? ""}
      />

      {/* Location performance */}
      <section className="m-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-base font-bold text-[#140516]">Location performance</h2>
          <span className="text-xs text-[#A19BA2]">{data.perLocation.length} location{data.perLocation.length === 1 ? "" : "s"}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-[#eee] bg-[#faf8fa] text-left text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">
              <tr>
                <th className="px-5 py-2.5">Location</th>
                <th className="px-3 py-2.5 w-24 text-right">Records</th>
                <th className="px-3 py-2.5 w-28 text-right">Avg risk</th>
                <th className="px-3 py-2.5 w-24 text-right">High risk</th>
                <th className="px-3 py-2.5 w-28 text-right">Follow-ups</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3eef3]">
              {data.perLocation.map((l) => (
                <tr key={l.id} className="hover:bg-[#faf8fa]">
                  <td className="px-5 py-2.5 font-medium text-[#140516]">{l.name}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#726973]">{l.records}</td>
                  <td className="px-3 py-2.5 text-right">
                    {l.records === 0 ? <span className="text-[#C9C4C9]">—</span> : (
                      <span className="inline-flex rounded-md px-2 py-0.5 text-xs font-bold" style={{ backgroundColor: `${riskColor(l.avgRisk)}1a`, color: riskColor(l.avgRisk) }}>{l.avgRisk}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#726973]">{l.highRisk}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-[#e2445c]">{l.followUps || <span className="font-normal text-[#C9C4C9]">—</span>}</td>
                </tr>
              ))}
              {data.perLocation.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-[#A19BA2]">No locations in scope.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Attention queue */}
        <section className="m-card p-5">
          <h2 className="mb-3 text-base font-bold text-[#140516]">Attention queue <span className="text-sm font-normal text-[#A19BA2]">· {data.attention.length}</span></h2>
          <div className="space-y-2">
            {data.attention.map((e) => <EntryRow key={e.id} e={e} />)}
            {data.attention.length === 0 && <Empty>No records currently require follow-up. 🎉</Empty>}
          </div>
        </section>

        {/* Recent activity */}
        <section className="m-card p-5">
          <h2 className="mb-3 text-base font-bold text-[#140516]">Recent logbook activity</h2>
          <div className="space-y-2">
            {data.recent.map((e) => <EntryRow key={e.id} e={e} />)}
            {data.recent.length === 0 && <Empty>No logbook records match these filters.</Empty>}
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, color, sub }: { label: string; value: number; color: string; sub: string }) {
  return (
    <div className="m-card relative overflow-hidden p-4">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
      <div className="text-3xl font-extrabold" style={{ color }}>{value}</div>
      <div className="mt-0.5 text-xs font-semibold text-[#140516]">{label}</div>
      <div className="text-[11px] text-[#A19BA2]">{sub}</div>
    </div>
  );
}

function EntryRow({ e }: { e: { id: string; body: string; category: LogCategory; locationName: string; authorName: string; riskLevel: RiskLevel | null; createdAt: string } }) {
  return (
    <Link href="/logbook" className="block rounded-lg border border-[#EEEAEE] px-3 py-2.5 transition-colors hover:bg-[#FAF6FA]">
      <div className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-sm text-[#140516]">{e.body}</span>
        {e.riskLevel && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${RISK_STYLE[e.riskLevel]}`}>{e.riskLevel}</span>}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-[#A19BA2]">
        <span className="font-semibold text-[#726973]">{CATEGORY_LABEL[e.category]}</span>
        <span>· {e.locationName}</span>
        <span>· {e.authorName}</span>
        <span>· {formatDateTime(new Date(e.createdAt))}</span>
      </div>
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-[#E4DDE4] py-8 text-center text-sm text-[#A19BA2]">{children}</div>;
}
