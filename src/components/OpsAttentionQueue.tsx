"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveOpsItem } from "@/lib/ops-sync";

type Item = {
  id: string; message: string; summary: string | null; category: string; locationName: string;
  writerName: string; severity: string | null; riskScore: number | null; recommendedAction: string | null;
  date: string; postedAt: string;
};
type Stats = {
  total: number; high: number; medium: number; low: number; resolved: number;
  topLocation: { name: string; count: number } | null; topCategory: { name: string; count: number } | null;
};

const SEV: Record<string, { bar: string; badge: string }> = {
  High: { bar: "#e2445c", badge: "bg-[#e2445c1a] text-[#e2445c]" },
  Critical: { bar: "#e2445c", badge: "bg-[#e2445c1a] text-[#e2445c]" },
  Severe: { bar: "#e2445c", badge: "bg-[#e2445c1a] text-[#e2445c]" },
  Medium: { bar: "#F4A626", badge: "bg-[#F4A6261a] text-[#B45309]" },
  Low: { bar: "#1DBA87", badge: "bg-[#1DBA871a] text-[#1DBA87]" },
};
function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function OpsAttentionQueue({ items, stats }: { items: Item[]; stats: Stats }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const resolve = (id: string) => {
    setBusyId(id);
    startTransition(async () => {
      await resolveOpsItem(id, true);
      setBusyId(null);
      router.refresh();
    });
  };

  return (
    <section className="m-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-[#140516]">Attention queue <span className="text-sm font-normal text-[#A19BA2]">· {stats.total} open</span></h2>
        {stats.resolved > 0 && <span className="text-xs font-semibold text-[#1DBA87]">✓ {stats.resolved} resolved</span>}
      </div>

      {/* Breakdown — severity mix + where to look first */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Chip className="bg-[#e2445c1a] text-[#e2445c]">{stats.high} high</Chip>
        <Chip className="bg-[#F4A6261a] text-[#B45309]">{stats.medium} medium</Chip>
        <Chip className="bg-[#F3EEF3] text-[#726973]">{stats.low} low</Chip>
        {stats.topLocation && <Chip className="border border-[#E4DDE4] text-[#726973]">🔥 {stats.topLocation.name} ({stats.topLocation.count})</Chip>}
        {stats.topCategory && <Chip className="border border-[#E4DDE4] text-[#726973]">Top: {stats.topCategory.name} ({stats.topCategory.count})</Chip>}
      </div>

      <div className="space-y-2">
        {items.map((e) => {
          const sev = (e.severity && SEV[e.severity]) || SEV.Low;
          return (
            <div key={e.id} className="flex items-stretch gap-3 overflow-hidden rounded-lg border border-[#EEEAEE]">
              <span className="w-1 shrink-0" style={{ backgroundColor: sev.bar }} />
              <div className="min-w-0 flex-1 py-2.5 pr-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                  {e.severity && <span className={`rounded-full px-2 py-0.5 font-bold ${sev.badge}`}>{e.severity}</span>}
                  {e.riskScore != null && <span className="font-semibold text-[#726973]">risk {e.riskScore}</span>}
                  <span className="font-semibold text-[#140516]">{e.locationName}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-[#433745]">{e.message || e.summary}</p>
                <div className="mt-1 text-[11px] text-[#A19BA2]">{e.category} · {e.writerName} · {fmt(e.postedAt)}</div>
              </div>
              <button
                onClick={() => resolve(e.id)}
                disabled={busyId === e.id}
                title="Mark handled"
                className="my-2 mr-2 shrink-0 self-center rounded-lg border border-[#E4DDE4] px-2.5 py-1.5 text-xs font-semibold text-[#726973] transition-colors hover:border-[#1DBA87] hover:bg-[#1DBA871a] hover:text-[#1DBA87] disabled:opacity-50"
              >
                {busyId === e.id ? "…" : "✓ Handled"}
              </button>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#E4DDE4] py-8 text-center text-sm text-[#A19BA2]">No open follow-ups. 🎉</div>
        )}
      </div>

      {stats.total > items.length && (
        <p className="mt-3 text-xs text-[#A19BA2]">Showing the {items.length} most urgent of {stats.total} — clear these to reveal the rest.</p>
      )}
    </section>
  );
}

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}
