"use client";

import { useState, useTransition } from "react";
import { getTodayRollup, type RollupLocation } from "@/lib/logbook";

const CATS: { key: keyof Pick<RollupLocation, "operations" | "salesMetrics" | "complaints" | "actionNeeded">; label: string; color: string }[] = [
  { key: "operations", label: "Operations", color: "#5B8DD9" },
  { key: "salesMetrics", label: "Sales / Metrics", color: "#1DBA87" },
  { key: "complaints", label: "Customer Complaints", color: "#e2445c" },
  { key: "actionNeeded", label: "Action Needed", color: "#F4A626" },
];

function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function RollupTab({ initialDay, initialLocations }: { initialDay: string; initialLocations: RollupLocation[] }) {
  const [day, setDay] = useState(initialDay);
  const [locations, setLocations] = useState(initialLocations);
  const [busy, startTransition] = useTransition();

  function goto(nextDay: string) {
    startTransition(async () => {
      const res = await getTodayRollup(nextDay);
      setDay(res.day);
      setLocations(res.locations);
    });
  }

  const label = new Date(`${day}T12:00:00.000Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => goto(shiftDay(day, -1))} className="rounded-lg border border-[#E4DDE4] px-2.5 py-1.5 text-xs font-semibold text-[#726973] hover:bg-[#FAF6FA]">← Prev</button>
          <span className="text-sm font-semibold text-[#140516]">{label}{busy ? " …" : ""}</span>
          <button onClick={() => goto(shiftDay(day, 1))} className="rounded-lg border border-[#E4DDE4] px-2.5 py-1.5 text-xs font-semibold text-[#726973] hover:bg-[#FAF6FA]">Next →</button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#A19BA2]">{locations.length} location{locations.length !== 1 ? "s" : ""}</span>
          <a
            href={`/logbook/pdf?date=${day}`}
            className="rounded-lg border border-[#440E48] px-3 py-1.5 text-xs font-semibold text-[#440E48] hover:bg-[#FAF6FA]"
          >
            ↓ Export PDF
          </a>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {locations.map((loc) => (
          <div key={loc.id} className="m-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#140516]">{loc.name}</h3>
              <span className="rounded-full bg-[#F3EEF3] px-2.5 py-0.5 text-[11px] font-semibold text-[#726973]">
                {loc.recordCount} record{loc.recordCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              {CATS.map((c) => {
                const items = loc[c.key];
                return (
                  <div key={c.key}>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#726973]">{c.label}</span>
                    </div>
                    {items.length === 0 ? (
                      <div className="text-[#C9C4C9]">—</div>
                    ) : (
                      <ul className="space-y-1.5">
                        {items.map((it) => (
                          <li key={it.id} className="text-[#433745]">
                            {it.itemTag && <span className="mr-1 rounded bg-[#F3EEF3] px-1.5 py-0.5 text-[10px] font-medium text-[#726973]">{it.itemTag}</span>}
                            {it.body}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {locations.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-[#E4DDE4] py-10 text-center text-sm text-[#A19BA2]">No locations in scope.</div>
        )}
      </div>
    </div>
  );
}
