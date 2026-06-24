"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeTaskStatus } from "@/lib/tasks";

const CADENCE_HEX: Record<string, string> = {
  DAILY: "#440E48",
  WEEKLY: "#5B8DD9",
  SCHEDULED: "#F4A626",
};

type CellTask = { id: string; status: string; proofRequired: boolean } | null;
type PlannerRow = {
  label: string;
  cadence: "DAILY" | "WEEKLY" | "SCHEDULED";
  days: number[];
  cells: Record<number, CellTask>;
};

export function DashboardWeeklyPlanner({
  weekDates,
  rows,
  dayCounts,
}: {
  weekDates: string[];
  rows: PlannerRow[];
  dayCounts: number[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const dates = weekDates.map((d) => new Date(d));

  function complete(taskId: string, proofRequired: boolean) {
    if (proofRequired) {
      setErr("This task needs photo proof — open it to complete.");
      return;
    }
    setBusy(taskId);
    startTransition(async () => {
      const res = await changeTaskStatus(taskId, "DONE");
      setBusy(null);
      if (!res.ok) setErr(res.error ?? "Something went wrong");
      else { setErr(null); router.refresh(); }
    });
  }

  return (
    <section className="m-card">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-[#440E48]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
          </span>
          <h2 className="text-base font-bold text-[#140516]">Weekly Planner</h2>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#726973]">
          {(["DAILY", "WEEKLY", "SCHEDULED"] as const).map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CADENCE_HEX[c] }} />
              {c[0] + c.slice(1).toLowerCase()}
            </span>
          ))}
        </div>
      </div>

      {err && (
        <div className="mx-5 mb-2 rounded-lg border border-[#f3d3d8] bg-[#fdf2f3] px-3 py-2 text-xs font-medium text-[#e2445c]">{err}</div>
      )}

      <div className="overflow-x-auto px-3 pb-4">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr>
              <th className="w-52 px-2 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">Task</th>
              {dates.map((d, i) => (
                <th key={i} className="px-1 pb-2 text-center">
                  <div className="text-[10px] font-semibold uppercase text-[#A19BA2]">{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
                  <div className="text-[11px] text-[#726973]">{d.getDate()}</div>
                  <div className="mx-auto mt-1 grid h-5 w-5 place-items-center rounded-full bg-[#f3eef3] text-[10px] font-bold text-[#726973]">{dayCounts[i]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="border-t border-[#f4f0f4]">
                <td className="py-2 pr-2">
                  <span className="block truncate text-xs font-medium text-[#140516]" title={r.label}>{r.label}</span>
                </td>
                {dates.map((_, i) => {
                  if (!r.days.includes(i)) {
                    return <td key={i} className="px-1 py-2 text-center" />;
                  }

                  const cell = r.cells[i];
                  if (!cell) {
                    // Planned but no generated task yet — show cadence dot
                    return (
                      <td key={i} className="px-1 py-2 text-center">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CADENCE_HEX[r.cadence] }} />
                      </td>
                    );
                  }

                  const isDone = cell.status === "DONE" || cell.status === "VERIFIED";
                  if (isDone) {
                    return (
                      <td key={i} className="px-1 py-2 text-center">
                        <Link href={`/tasks/${cell.id}`} title="Completed">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D]">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </span>
                        </Link>
                      </td>
                    );
                  }

                  // Open task — show clickable checkbox
                  return (
                    <td key={i} className="px-1 py-2 text-center">
                      <button
                        onClick={() => complete(cell.id, cell.proofRequired)}
                        disabled={busy === cell.id}
                        title="Mark done"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#D0CDD0] text-transparent transition-colors hover:border-[#1DBA87] hover:text-[#1DBA87] disabled:opacity-50"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="py-6 text-center text-xs text-[#A19BA2]">No recurring items this week.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
