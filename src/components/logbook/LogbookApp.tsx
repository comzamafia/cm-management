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
          <p className="mt-3 text-center text-sm font-semibold text-[#1DBA87]">✓ Entry submitted</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AttentionBanner initialCount={initialAttentionCount} />

      {initialKpi && <KpiCharts data={initialKpi} />}

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["rollup", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                tab === t ? "bg-[#440E48] text-white" : "border border-[#E4DDE4] text-[#726973] hover:bg-[#FAF6FA]"
              }`}
            >
              {t === "rollup" ? "Daily Rollup" : "History"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-[#440E48] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#5a1560]"
        >
          {showForm ? "Hide form" : "+ New entry"}
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
