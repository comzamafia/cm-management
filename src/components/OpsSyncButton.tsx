"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncOpsData } from "@/lib/ops-sync";

export function OpsSyncButton() {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  const run = () => {
    setMsg(null);
    setErr(false);
    startTransition(async () => {
      const res = await syncOpsData();
      if (!res.ok) { setErr(true); setMsg(res.error ?? "Sync failed"); return; }
      setMsg(`Synced ${res.fetched} · ${res.created} new, ${res.updated} updated${res.purged ? `, ${res.purged} old removed` : ""}`);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-3">
      {msg && <span className={`text-xs font-medium ${err ? "text-[#e2445c]" : "text-[#1DBA87]"}`}>{msg}</span>}
      <button
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-[#440E48] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#5a1560] disabled:opacity-60"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={busy ? "animate-spin" : ""}>
          <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        </svg>
        {busy ? "Syncing…" : "Sync data"}
      </button>
    </div>
  );
}
