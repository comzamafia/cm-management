import Link from "next/link";
import { getCurrentUser, isManager } from "@/lib/auth";
import { getUserStats } from "@/lib/reports";
import { ROLE_LABEL } from "@/lib/labels";

function rateColor(r: number | null) {
  if (r === null) return "text-slate-400";
  if (r >= 90) return "text-emerald-600 font-semibold";
  if (r >= 70) return "text-amber-600 font-semibold";
  return "text-red-600 font-semibold";
}

export default async function WhoPage() {
  const user = await getCurrentUser();
  if (!user || !isManager(user.role)) {
    return <div className="text-slate-600">Manager access required.</div>;
  }

  const stats = await getUserStats(user);
  const sorted = [...stats].sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">← Dashboard</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-semibold text-slate-900">WHO — People</h1>
      </div>
      <p className="text-sm text-slate-500">Completion rate and overdue count per team member.</p>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Location</th>
              <th className="px-4 py-2.5 text-right">Assigned</th>
              <th className="px-4 py-2.5 text-right">Done</th>
              <th className="px-4 py-2.5 text-right">Overdue</th>
              <th className="px-4 py-2.5 text-right">Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map(({ user: u, total, done, overdue, rate }) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/who/${u.id}`} className="font-medium text-slate-800 hover:underline">
                    {u.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">{ROLE_LABEL[u.role]}</td>
                <td className="px-4 py-3 text-slate-500">{u.location?.name ?? "—"}</td>
                <td className="px-4 py-3 text-right text-slate-600">{total}</td>
                <td className="px-4 py-3 text-right text-emerald-600">{done}</td>
                <td className="px-4 py-3 text-right text-red-600">{overdue > 0 ? overdue : "—"}</td>
                <td className={`px-4 py-3 text-right ${rateColor(rate)}`}>
                  {rate === null ? "—" : `${rate}%`}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No users in scope.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
