"use client";

import { useEffect, useState, useTransition } from "react";
import { getAttentionQueue, resolveAttentionItem } from "@/lib/logbook";

type QueueEntry = Awaited<ReturnType<typeof getAttentionQueue>>[number];

export function AttentionBanner({ initialCount, onCountChange }: { initialCount: number; onCountChange?: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [count, setCount] = useState(initialCount);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function loadQueue() {
    startTransition(async () => {
      const res = await getAttentionQueue();
      setEntries(res);
      setCount(res.length);
      onCountChange?.(res.length);
    });
  }

  useEffect(() => {
    if (open) loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function resolve(id: string) {
    setBusyId(id);
    startTransition(async () => {
      await resolveAttentionItem(id);
      setBusyId(null);
      loadQueue();
    });
  }

  if (count === 0 && !open) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-[#f3d3d8] bg-[#fdf2f3]">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="flex items-center gap-2 text-sm font-bold text-[#e2445c]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Attention queue — {count} unresolved
        </span>
        <span className="text-xs font-semibold text-[#b3868c]">{open ? "Hide ▲" : "Show ▼"}</span>
      </button>
      {open && (
        <div className="divide-y divide-[#f3d3d8] border-t border-[#f3d3d8] bg-white/60 px-4">
          {entries.map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <div className="text-xs text-[#A19BA2]">{e.location.name} · {e.author.name}</div>
                <div className="text-[#140516]">{e.aiSummary ?? e.body}</div>
              </div>
              <button
                onClick={() => resolve(e.id)}
                disabled={busyId === e.id}
                className="shrink-0 rounded-lg bg-[#440E48] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#5a1560] disabled:opacity-60"
              >
                {busyId === e.id ? "…" : "Resolve"}
              </button>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="py-4 text-center text-xs text-[#A19BA2]">Nothing flagged right now.</div>
          )}
        </div>
      )}
    </div>
  );
}
