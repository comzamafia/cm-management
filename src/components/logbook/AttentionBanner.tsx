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
    <div className="rounded-xl border" style={{ borderColor: "var(--lb-red)", background: "color-mix(in srgb, var(--lb-red) 10%, var(--lb-surface))" }}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="flex items-center gap-2 text-sm font-bold" style={{ color: "var(--lb-red)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Attention Queue — {count} unresolved
        </span>
        <span className="text-xs" style={{ color: "var(--lb-text-soft)" }}>{open ? "Hide ▲" : "Show ▼"}</span>
      </button>
      {open && (
        <div className="divide-y border-t px-4" style={{ borderColor: "var(--lb-border)" }}>
          {entries.map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <div className="text-xs" style={{ color: "var(--lb-text-soft)" }}>{e.location.name} · {e.author.name}</div>
                <div style={{ color: "var(--lb-text)" }}>{e.aiSummary ?? e.body}</div>
              </div>
              <button
                onClick={() => resolve(e.id)}
                disabled={busyId === e.id}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                style={{ background: "var(--lb-accent)", color: "#140516" }}
              >
                {busyId === e.id ? "…" : "Resolve"}
              </button>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="py-4 text-center text-xs" style={{ color: "var(--lb-text-soft)" }}>Nothing flagged right now.</div>
          )}
        </div>
      )}
    </div>
  );
}
