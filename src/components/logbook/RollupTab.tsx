"use client";

import { useState, useTransition } from "react";
import { getTodayRollup, type RollupLocation } from "@/lib/logbook";

const CATS: { key: keyof Pick<RollupLocation, "operations" | "salesMetrics" | "complaints" | "actionNeeded">; label: string }[] = [
  { key: "operations", label: "Operations" },
  { key: "salesMetrics", label: "Sales / Metrics" },
  { key: "complaints", label: "Customer Complaints" },
  { key: "actionNeeded", label: "Action Needed" },
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => goto(shiftDay(day, -1))} className="rounded-lg border px-2 py-1 text-xs" style={{ borderColor: "var(--lb-border)", color: "var(--lb-text-soft)" }}>← Prev</button>
          <span className="text-sm font-semibold" style={{ color: "var(--lb-text)" }}>{label}{busy ? " …" : ""}</span>
          <button onClick={() => goto(shiftDay(day, 1))} className="rounded-lg border px-2 py-1 text-xs" style={{ borderColor: "var(--lb-border)", color: "var(--lb-text-soft)" }}>Next →</button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--lb-text-soft)" }}>{locations.length} location{locations.length !== 1 ? "s" : ""}</span>
          <a
            href={`/logbook/pdf?date=${day}`}
            className="rounded-lg border px-2.5 py-1 text-xs font-semibold"
            style={{ borderColor: "var(--lb-accent)", color: "var(--lb-accent)" }}
          >
            ↓ Export PDF
          </a>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {locations.map((loc) => (
          <div key={loc.id} className="rounded-xl border p-4" style={{ background: "var(--lb-surface)", borderColor: "var(--lb-border)" }}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: "var(--lb-text)" }}>{loc.name}</h3>
              <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--lb-surface-2)", color: "var(--lb-text-soft)" }}>
                {loc.recordCount} record{loc.recordCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {CATS.map((c) => {
                const items = loc[c.key];
                return (
                  <div key={c.key}>
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--lb-accent)" }}>{c.label}</div>
                    {items.length === 0 ? (
                      <div style={{ color: "var(--lb-text-soft)" }}>—</div>
                    ) : (
                      <ul className="space-y-1">
                        {items.map((it) => (
                          <li key={it.id} style={{ color: "var(--lb-text)" }}>
                            {it.itemTag && <span className="mr-1 rounded px-1 py-0.5 text-[10px]" style={{ background: "var(--lb-surface-2)", color: "var(--lb-text-soft)" }}>{it.itemTag}</span>}
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
          <div className="col-span-full py-8 text-center text-sm" style={{ color: "var(--lb-text-soft)" }}>No locations in scope.</div>
        )}
      </div>
    </div>
  );
}
