import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentUser, atLeast } from "@/lib/auth";
import { getOpsOverview, type OpsListItem } from "@/lib/ops-overview";
import { formatDateTime } from "@/lib/labels";
import { OpsFilters } from "@/components/OpsFilters";
import { OpsSyncButton } from "@/components/OpsSyncButton";
import { OpsAttentionQueue } from "@/components/OpsAttentionQueue";

export const dynamic = "force-dynamic";

const SEV_STYLE: Record<string, string> = {
  Critical: "bg-[#e2445c1a] text-[#e2445c]",
  Severe: "bg-[#e2445c1a] text-[#e2445c]",
  High: "bg-[#e2445c1a] text-[#e2445c]",
  Medium: "bg-[#F4A6261a] text-[#B45309]",
  Low: "bg-[#1DBA871a] text-[#1DBA87]",
};
function riskColor(v: number) {
  return v >= 70 ? "#e2445c" : v >= 40 ? "#F4A626" : "#1DBA87";
}
function sentiment(v: number) {
  if (v > 20) return { label: `+${v}`, color: "#1DBA87" };
  if (v < -20) return { label: `${v}`, color: "#e2445c" };
  return { label: `${v}`, color: "#726973" };
}

type SP = Promise<{ from?: string; to?: string; locationExtId?: string; category?: string }>;

export default async function PerformanceOverviewPage({ searchParams }: { searchParams: SP }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!atLeast(user.role, Role.STORE_MANAGER)) redirect("/logbook");

  const sp = await searchParams;
  const data = await getOpsOverview({ from: sp.from, to: sp.to, locationExtId: sp.locationExtId, category: sp.category });
  const sent = sentiment(data.kpi.avgSentiment);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#F4A626]">Operations Tracker</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-[#140516]">Performance overview</h1>
          <p className="mt-0.5 text-sm text-[#726973]">
            {data.period.from} → {data.period.to}
            {data.lastSyncedAt ? ` · last synced ${formatDateTime(new Date(data.lastSyncedAt))}` : " · not synced yet"}
          </p>
        </div>
        <OpsSyncButton />
      </div>

      {data.kpi.records === 0 && (
        <div className="m-card p-6 text-center text-sm text-[#726973]">
          No synced data for this window yet. Press <span className="font-semibold text-[#440E48]">Sync data</span> to pull the latest logbook analysis from the ops platform.
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label="Logbook records" value={data.kpi.records} color="#440E48" sub="in this period" />
        <Kpi label="Analyzed" value={data.kpi.analyzed} color="#5B8DD9" sub="AI processed" />
        <Kpi label="Average risk" value={data.kpi.avgRisk} color={riskColor(data.kpi.avgRisk)} sub="out of 100" />
        <Kpi label="Avg sentiment" value={sent.label} color={sent.color} sub="-100 to +100" />
        <Kpi label="Follow-ups" value={data.kpi.followUps} color="#F4A626" sub="need attention" />
      </div>

      <OpsFilters
        locations={data.locations}
        categories={data.categories}
        from={sp.from ?? data.period.from}
        to={sp.to ?? data.period.to}
        locationExtId={sp.locationExtId ?? ""}
        category={sp.category ?? ""}
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
                <th className="px-3 py-2.5 w-28 text-right">High severity</th>
                <th className="px-3 py-2.5 w-28 text-right">Follow-ups</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3eef3]">
              {data.perLocation.map((l) => (
                <tr key={l.name} className="hover:bg-[#faf8fa]">
                  <td className="px-5 py-2.5 font-medium text-[#140516]">{l.name}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#726973]">{l.records}</td>
                  <td className="px-3 py-2.5 text-right">
                    {l.records === 0 ? <span className="text-[#C9C4C9]">—</span> : (
                      <span className="inline-flex rounded-md px-2 py-0.5 text-xs font-bold" style={{ backgroundColor: `${riskColor(l.avgRisk)}1a`, color: riskColor(l.avgRisk) }}>{l.avgRisk}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#726973]">{l.highSeverity}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-[#e2445c]">{l.followUps || <span className="font-normal text-[#C9C4C9]">—</span>}</td>
                </tr>
              ))}
              {data.perLocation.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-[#A19BA2]">No records in this window.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <OpsAttentionQueue items={data.attention} stats={data.attentionStats} />

        <section className="m-card p-5">
          <h2 className="mb-3 text-base font-bold text-[#140516]">Recent activity</h2>
          <div className="space-y-2">
            {data.recent.map((e) => <OpsRow key={e.id} e={e} />)}
            {data.recent.length === 0 && <Empty>No logbook records match these filters.</Empty>}
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, color, sub }: { label: string; value: number | string; color: string; sub: string }) {
  return (
    <div className="m-card relative overflow-hidden p-4">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
      <div className="text-3xl font-extrabold" style={{ color }}>{value}</div>
      <div className="mt-0.5 text-xs font-semibold text-[#140516]">{label}</div>
      <div className="text-[11px] text-[#A19BA2]">{sub}</div>
    </div>
  );
}

function OpsRow({ e, showAction }: { e: OpsListItem; showAction?: boolean }) {
  return (
    <div className="rounded-lg border border-[#EEEAEE] px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-[#140516]">{e.summary ?? e.message}</span>
        {e.severity && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${SEV_STYLE[e.severity] ?? "bg-[#F3EEF3] text-[#726973]"}`}>{e.severity}</span>}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-[#A19BA2]">
        <span className="font-semibold text-[#726973]">{e.category}</span>
        <span>· {e.locationName}</span>
        <span>· {e.writerName}</span>
        {e.riskScore != null && <span style={{ color: riskColor(e.riskScore) }}>· risk {e.riskScore}</span>}
        <span>· {formatDateTime(new Date(e.postedAt))}</span>
      </div>
      {showAction && e.recommendedAction && (
        <div className="mt-1.5 rounded-md bg-[#FAF6FA] px-2 py-1 text-[11px] text-[#5a1560]">→ {e.recommendedAction}</div>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-[#E4DDE4] py-8 text-center text-sm text-[#A19BA2]">{children}</div>;
}
