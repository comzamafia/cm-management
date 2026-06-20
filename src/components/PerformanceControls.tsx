"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type BranchOpt = { id: string; label: string; hasKey: boolean };

type Props = {
  branches: BranchOpt[];
  branchId: string;
  from: string;
  to: string;
  view: string;
};

const PRESETS = [
  { days: 7, label: "7 days" },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
];

const VIEWS = [
  { id: "score", label: "Performance Score" },
  { id: "upsell", label: "Upsell % (Bev / Liquor / Dessert)" },
];

function isoDaysAgo(to: string, days: number): string {
  const end = new Date(`${to}T00:00:00Z`);
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  return start.toISOString().slice(0, 10);
}

export function PerformanceControls({ branches, branchId, from, to, view }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function push(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => sp.set(k, v));
    startTransition(() => router.push(`/performance?${sp.toString()}`));
  }

  const activePreset = PRESETS.find((p) => isoDaysAgo(to, p.days) === from)?.days ?? null;

  return (
    <div className="space-y-3 print:hidden">
      {/* View tabs */}
      <div className="flex gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => push({ view: v.id })}
            disabled={pending}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              view === v.id
                ? "bg-[#440E48] text-white shadow-sm"
                : "bg-white text-[#726973] ring-1 ring-inset ring-[#E4DDE4] hover:bg-[#FAF6FA]"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#726973]">Branch</span>
          <select
            value={branchId}
            onChange={(e) => push({ branch: e.target.value })}
            disabled={pending}
            className="rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm font-medium text-[#140516] outline-none focus:border-[#440E48]"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}{b.hasKey ? "" : " (no key)"}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#726973]">From</span>
          <input type="date" value={from} max={to} onChange={(e) => push({ from: e.target.value })}
            disabled={pending} className="rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm text-[#140516] outline-none focus:border-[#440E48]" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#726973]">To</span>
          <input type="date" value={to} min={from} onChange={(e) => push({ to: e.target.value })}
            disabled={pending} className="rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm text-[#140516] outline-none focus:border-[#440E48]" />
        </label>

        <div className="flex gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.days} onClick={() => push({ from: isoDaysAgo(to, p.days), to })} disabled={pending}
              className={`rounded-full px-3 py-2 text-xs font-semibold ${
                activePreset === p.days ? "bg-[#440E48] text-white" : "bg-[#F0EBF0] text-[#726973] hover:bg-[#E4DDE4]"
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        <a
          href={`/performance/pdf?branch=${encodeURIComponent(branchId)}&from=${from}&to=${to}`}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-[#440E48] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><polyline points="9 15 12 18 15 15" />
          </svg>
          Export PDF
        </a>
      </div>
    </div>
  );
}
