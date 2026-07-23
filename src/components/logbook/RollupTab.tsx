"use client";

import { useState, useTransition } from "react";
import { getSyncedRollup, type SyncedRollupLocation } from "@/lib/ops-sync";

const SEV_STYLE: Record<string, string> = {
  High: "bg-[#e2445c1a] text-[#e2445c]", Critical: "bg-[#e2445c1a] text-[#e2445c]", Severe: "bg-[#e2445c1a] text-[#e2445c]",
  Medium: "bg-[#F4A6261a] text-[#B45309]", Low: "bg-[#1DBA871a] text-[#1DBA87]",
};

function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function RollupTab({ initialDay, initialLocations }: { initialDay: string; initialLocations: SyncedRollupLocation[] }) {
  const [day, setDay] = useState(initialDay);
  const [locations, setLocations] = useState(initialLocations);
  const [busy, startTransition] = useTransition();

  function goto(nextDay: string) {
    startTransition(async () => {
      const res = await getSyncedRollup(nextDay);
      setDay(res.day);
      setLocations(res.locations);
    });
  }

  const label = new Date(`${day}T12:00:00.000Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
  const totalRecords = locations.reduce((n, l) => n + l.recordCount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => goto(shiftDay(day, -1))} className="rounded-lg border border-[#E4DDE4] px-2.5 py-1.5 text-xs font-semibold text-[#726973] hover:bg-[#FAF6FA]">← Prev</button>
          <span className="text-sm font-semibold text-[#140516]">{label}{busy ? " …" : ""}</span>
          <button onClick={() => goto(shiftDay(day, 1))} className="rounded-lg border border-[#E4DDE4] px-2.5 py-1.5 text-xs font-semibold text-[#726973] hover:bg-[#FAF6FA]">Next →</button>
        </div>
        <span className="text-xs text-[#A19BA2]">{totalRecords} record{totalRecords !== 1 ? "s" : ""} · {locations.length} location{locations.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {locations.map((loc) => (
          <div key={loc.name} className="m-card p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-[#140516]">{loc.name}</h3>
              <div className="flex items-center gap-2">
                {loc.followUps > 0 && <span className="rounded-full bg-[#e2445c1a] px-2 py-0.5 text-[11px] font-bold text-[#e2445c]">{loc.followUps} follow-up</span>}
                <span className="rounded-full bg-[#F3EEF3] px-2.5 py-0.5 text-[11px] font-semibold text-[#726973]">{loc.recordCount} record{loc.recordCount !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <div className="space-y-3">
              {loc.categories.map((cat) => (
                <div key={cat.name}>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#5B8DD9]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#726973]">{cat.name}</span>
                    <span className="text-[10px] text-[#C9C4C9]">{cat.posts.length}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {cat.posts.map((p) => (
                      <li key={p.id} className="text-xs">
                        <div className="text-[#433745]">{p.message}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-[#A19BA2]">
                          {p.severity && <span className={`rounded-full px-1.5 py-0.5 font-bold ${SEV_STYLE[p.severity] ?? "bg-[#F3EEF3] text-[#726973]"}`}>{p.severity}</span>}
                          {p.riskScore != null && <span className="font-semibold text-[#726973]">risk {p.riskScore}</span>}
                          {p.followUp && <span className="rounded-full bg-[#e2445c1a] px-1.5 py-0.5 font-bold text-[#e2445c]">follow-up</span>}
                          <span>· {p.writerName}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
        {locations.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-[#E4DDE4] py-10 text-center text-sm text-[#A19BA2]">
            No synced records for this day. Use the <span className="font-semibold text-[#440E48]">Synced feed</span> tab to pull the latest.
          </div>
        )}
      </div>
    </div>
  );
}
