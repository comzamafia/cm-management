"use client";

import { useEffect, useState, useTransition } from "react";
import { getTodayRollup, type RollupLocation } from "@/lib/logbook";
import { getSyncedDay, type SyncedDayLocation } from "@/lib/ops-sync";

const SEV_STYLE: Record<string, string> = {
  High: "bg-[#e2445c1a] text-[#e2445c]", Critical: "bg-[#e2445c1a] text-[#e2445c]", Severe: "bg-[#e2445c1a] text-[#e2445c]",
  Medium: "bg-[#F4A6261a] text-[#B45309]", Low: "bg-[#1DBA871a] text-[#1DBA87]",
};

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
  const [synced, setSynced] = useState<SyncedDayLocation[]>([]);
  const [busy, startTransition] = useTransition();

  // Internal rollup arrives from the server; fetch the synced feed for the initial
  // day on mount, then both together whenever the day changes.
  useEffect(() => {
    startTransition(async () => setSynced(await getSyncedDay(initialDay)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goto(nextDay: string) {
    startTransition(async () => {
      const [res, syncedDay] = await Promise.all([getTodayRollup(nextDay), getSyncedDay(nextDay)]);
      setDay(res.day);
      setLocations(res.locations);
      setSynced(syncedDay);
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

      {/* Synced feed (7shifts) for the same day, grouped by location */}
      {synced.length > 0 && (
        <div>
          <div className="mb-2 mt-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#5B8DD9]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#726973]">Synced feed · 7shifts</h3>
            <span className="text-xs text-[#A19BA2]">{synced.reduce((n, l) => n + l.posts.length, 0)} posts</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {synced.map((loc) => (
              <div key={loc.name} className="m-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#140516]">{loc.name}</h3>
                  <span className="rounded-full bg-[#F3EEF3] px-2.5 py-0.5 text-[11px] font-semibold text-[#726973]">{loc.posts.length} post{loc.posts.length !== 1 ? "s" : ""}</span>
                </div>
                <ul className="space-y-2.5">
                  {loc.posts.map((p) => (
                    <li key={p.id} className="text-xs">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[#A19BA2]">
                        <span className="font-semibold text-[#726973]">{p.category}</span>
                        {p.severity && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${SEV_STYLE[p.severity] ?? "bg-[#F3EEF3] text-[#726973]"}`}>{p.severity}</span>}
                        {p.riskScore != null && <span className="font-semibold">risk {p.riskScore}</span>}
                        {p.followUp && <span className="rounded-full bg-[#e2445c1a] px-1.5 py-0.5 text-[10px] font-bold text-[#e2445c]">follow-up</span>}
                      </div>
                      <div className="mt-0.5 text-[#433745]">{p.message}</div>
                      <div className="mt-0.5 text-[10px] text-[#C9C4C9]">{p.writerName}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
