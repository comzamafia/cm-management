import Link from "next/link";
import { getCurrentUser, isManager } from "@/lib/auth";
import { getServerPerformance } from "@/lib/performance";
import { startOfDayTZ } from "@/lib/time";

export const dynamic = "force-dynamic";

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to view performance.</div>;
  if (!isManager(user.role) && user.role !== "SHIFT_LEAD") {
    return <div className="text-[#726973]">Manager access required.</div>;
  }

  const { days } = await searchParams;
  const range = days === "30" ? 30 : days === "1" ? 1 : 7;
  const to = new Date();
  const from = new Date(startOfDayTZ(to).getTime() - (range - 1) * 86400000);
  const { servers, totals } = await getServerPerformance(user, { from, to });

  const RANGES = [
    { d: 1, label: "Today" },
    { d: 7, label: "7 days" },
    { d: 30, label: "30 days" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">Server Performance</h1>
          <p className="mt-0.5 text-sm text-[#726973]">Sales, covers, tips and reviews per server — fed from your POS via API.</p>
        </div>
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <Link key={r.d} href={`/performance?days=${r.d}`}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${range === r.d ? "bg-[#440E48] text-white" : "bg-[#F0EBF0] text-[#726973] hover:bg-[#E4DDE4]"}`}>
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Total Sales" value={money(totals.sales)} color="#1DBA87" />
        <Kpi label="Covers" value={totals.covers.toLocaleString()} color="#5B8DD9" />
        <Kpi label="Avg Check" value={money(totals.avgCheck)} color="#F4A626" />
        <Kpi label="Servers" value={String(totals.servers)} color="#440E48" />
      </div>

      <section className="m-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[#eee] bg-[#faf8fa] text-left text-[10px] font-bold uppercase tracking-wider text-[#726973]">
              <tr>
                <th className="px-4 py-2.5 w-10">#</th>
                <th className="px-4 py-2.5">Server</th>
                <th className="px-3 py-2.5">Location</th>
                <th className="px-3 py-2.5 text-right">Sales</th>
                <th className="px-3 py-2.5 text-right">Covers</th>
                <th className="px-3 py-2.5 text-right">Avg Check</th>
                <th className="px-3 py-2.5 text-right">Tips</th>
                <th className="px-3 py-2.5 text-right">Tip %</th>
                <th className="px-3 py-2.5 text-right">Upsells</th>
                <th className="px-3 py-2.5 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3eef3]">
              {servers.map((s, i) => (
                <tr key={s.serverId} className="hover:bg-[#faf8fa]">
                  <td className="px-4 py-2.5 font-bold text-[#A19BA2]">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/dashboard/who/${s.serverId}`} className="font-semibold text-[#140516] hover:text-[#440E48]">{s.name}</Link>
                  </td>
                  <td className="px-3 py-2.5 text-[#726973]">{s.locationName}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-[#140516]">{money(s.sales)}</td>
                  <td className="px-3 py-2.5 text-right text-[#726973]">{s.covers}</td>
                  <td className="px-3 py-2.5 text-right text-[#726973]">{money(s.avgCheck)}</td>
                  <td className="px-3 py-2.5 text-right text-[#726973]">{money(s.tips)}</td>
                  <td className="px-3 py-2.5 text-right text-[#726973]">{s.tipPct.toFixed(1)}%</td>
                  <td className="px-3 py-2.5 text-right text-[#726973]">{s.upsells}</td>
                  <td className="px-3 py-2.5 text-right">
                    {s.reviewAvg != null
                      ? <span className="font-semibold text-[#F4A626]">★ {s.reviewAvg.toFixed(1)}</span>
                      : <span className="text-[#C9C4C9]">—</span>}
                  </td>
                </tr>
              ))}
              {servers.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-[#A19BA2]">
                  No performance data for this range. Push data to <code className="rounded bg-[#F0EBF0] px-1">POST /api/performance</code> from your POS/website.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="m-card relative overflow-hidden p-4">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
      <div className="text-2xl font-extrabold lg:text-3xl" style={{ color }}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-[#726973]">{label}</div>
    </div>
  );
}
