import Link from "next/link";
import { getCurrentUser, isManager } from "@/lib/auth";
import { getDepartmentStats } from "@/lib/reports";
import { PRIORITY_LABEL } from "@/lib/labels";

function rateBar(rate: number | null) {
  const pct = rate ?? 0;
  const color = pct >= 90 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold ${pct >= 90 ? "text-emerald-600" : pct >= 70 ? "text-amber-600" : "text-red-600"}`}>
        {rate === null ? "—" : `${rate}%`}
      </span>
    </div>
  );
}

export default async function WhatPage() {
  const user = await getCurrentUser();
  if (!user || !isManager(user.role)) {
    return <div className="text-slate-600">Manager access required.</div>;
  }

  const departments = await getDepartmentStats(user);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">← Dashboard</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-semibold text-slate-900">Departments</h1>
      </div>
      <p className="text-sm text-slate-500">Which categories are falling behind or performing well.</p>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Department</th>
              <th className="px-4 py-2.5 text-right">Total</th>
              <th className="px-4 py-2.5 text-right">Done</th>
              <th className="px-4 py-2.5 text-right">Overdue</th>
              <th className="px-4 py-2.5">Completion Rate</th>
              <th className="px-4 py-2.5">Priority Mix</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {departments.map((d) => (
              <tr key={d.dept} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{d.dept}</td>
                <td className="px-4 py-3 text-right text-slate-600">{d.total}</td>
                <td className="px-4 py-3 text-right text-emerald-600">{d.done}</td>
                <td className="px-4 py-3 text-right">
                  {d.overdue > 0
                    ? <span className="font-semibold text-red-600">{d.overdue}</span>
                    : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3">{rateBar(d.rate)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(d.priorities).map(([p, count]) => (
                      <span key={p} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                        {PRIORITY_LABEL[p as keyof typeof PRIORITY_LABEL]}: {count}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No tasks in scope.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Callouts */}
      {departments.some((d) => (d.rate ?? 100) < 70) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Attention:</strong>{" "}
          {departments
            .filter((d) => (d.rate ?? 100) < 70)
            .map((d) => `${d.dept} (${d.rate ?? 0}%)`)
            .join(", ")}{" "}
          {departments.filter((d) => (d.rate ?? 100) < 70).length === 1 ? "is" : "are"} below 70% completion.
        </div>
      )}
    </div>
  );
}
