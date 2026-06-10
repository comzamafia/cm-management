import Link from "next/link";
import { getCurrentUser, isManager } from "@/lib/auth";
import { getTrendData } from "@/lib/reports";
import { TrendChart } from "@/components/TrendChart";

export default async function WhenPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);

  if (!user || !isManager(user.role)) {
    return <div className="text-slate-600">Manager access required.</div>;
  }

  const days = Math.min(30, Math.max(7, Number(params.days ?? 14)));
  const data = await getTrendData(user, days);

  const totalCreated = data.reduce((s, d) => s + d.created, 0);
  const totalCompleted = data.reduce((s, d) => s + d.completed + d.verified, 0);
  const peakDay = [...data].sort((a, b) => (b.completed + b.verified) - (a.completed + a.verified))[0];

  const dayOptions = [7, 14, 30];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">← Dashboard</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-semibold text-slate-900">WHEN — Timeline</h1>
      </div>

      <div className="flex items-center gap-2">
        {dayOptions.map((d) => (
          <Link
            key={d}
            href={`/dashboard/when?days=${d}`}
            className={`rounded-full px-3 py-1 text-sm ring-1 ring-inset ${
              days === d
                ? "bg-slate-900 text-white ring-slate-900"
                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {d} days
          </Link>
        ))}
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-2xl font-semibold text-slate-700">{totalCreated}</div>
          <div className="text-xs text-slate-500">Tasks created</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-2xl font-semibold text-emerald-600">{totalCompleted}</div>
          <div className="text-xs text-slate-500">Completed / verified</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-2xl font-semibold text-blue-600">
            {peakDay && (peakDay.completed + peakDay.verified) > 0 ? peakDay.date.slice(5) : "—"}
          </div>
          <div className="text-xs text-slate-500">Most productive day</div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Daily Activity — Last {days} Days
        </h2>
        <TrendChart data={data} />
      </div>

      {/* Day-by-day table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5 text-right">Created</th>
              <th className="px-4 py-2.5 text-right">Completed</th>
              <th className="px-4 py-2.5 text-right">Verified</th>
              <th className="px-4 py-2.5 text-right">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...data].reverse().map((d) => {
              const net = (d.completed + d.verified) - d.created;
              return (
                <tr key={d.date} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-700">{d.date}</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{d.created || "—"}</td>
                  <td className="px-4 py-2.5 text-right text-emerald-600">{d.completed || "—"}</td>
                  <td className="px-4 py-2.5 text-right text-violet-600">{d.verified || "—"}</td>
                  <td className={`px-4 py-2.5 text-right font-medium ${net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {net > 0 ? `+${net}` : net === 0 ? "0" : net}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
