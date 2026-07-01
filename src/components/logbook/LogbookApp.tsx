"use client";

import { useState } from "react";
import type { RollupLocation, getKpiData } from "@/lib/logbook";
import { NewEntryForm } from "./NewEntryForm";
import { RollupTab } from "./RollupTab";
import { HistoryTab } from "./HistoryTab";
import { KpiCharts } from "./KpiCharts";
import { AttentionBanner } from "./AttentionBanner";

type LocationOpt = { id: string; name: string };
type Tab = "rollup" | "history";

export function LogbookApp({
  canManage,
  locations,
  defaultLocationId,
  initialRollup,
  initialAttentionCount,
  initialKpi,
}: {
  canManage: boolean;
  locations: LocationOpt[];
  defaultLocationId: string | null;
  initialRollup: { day: string; locations: RollupLocation[] } | null;
  initialAttentionCount: number;
  initialKpi: Awaited<ReturnType<typeof getKpiData>> | null;
}) {
  const [tab, setTab] = useState<Tab>("rollup");
  const [showForm, setShowForm] = useState(!canManage);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!canManage) {
    return (
      <div className="max-w-xl">
        <NewEntryForm
          locations={locations}
          defaultLocationId={defaultLocationId}
          onCreated={() => setRefreshKey((k) => k + 1)}
        />
        {refreshKey > 0 && (
          <p className="mt-3 text-center text-sm" style={{ color: "var(--lb-green)" }}>✓ Entry submitted</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AttentionBanner initialCount={initialAttentionCount} />

      {initialKpi && <KpiCharts data={initialKpi} />}

      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border p-1" style={{ borderColor: "var(--lb-border)", background: "var(--lb-surface)" }}>
          {(["rollup", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="rounded-md px-3 py-1.5 text-xs font-semibold capitalize"
              style={tab === t
                ? { background: "var(--lb-accent)", color: "#140516" }
                : { color: "var(--lb-text-soft)" }}
            >
              {t === "rollup" ? "Daily Rollup" : "History"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg px-3 py-1.5 text-xs font-bold"
          style={{ background: "var(--lb-accent)", color: "#140516" }}
        >
          {showForm ? "Hide Form" : "+ New Entry"}
        </button>
      </div>

      {showForm && (
        <NewEntryForm
          locations={locations}
          defaultLocationId={defaultLocationId}
          onCreated={() => { setShowForm(false); setRefreshKey((k) => k + 1); }}
          onClose={() => setShowForm(false)}
        />
      )}

      {tab === "rollup" && initialRollup && (
        <RollupTab key={refreshKey} initialDay={initialRollup.day} initialLocations={initialRollup.locations} />
      )}
      {tab === "history" && <HistoryTab key={refreshKey} locations={locations} />}
    </div>
  );
}
