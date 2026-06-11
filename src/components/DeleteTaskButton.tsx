"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTask } from "@/lib/tasks";

export function DeleteTaskButton({
  taskId,
  compact = false,
  redirectTo,
}: {
  taskId: string;
  compact?: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function remove() {
    setError(null);
    start(async () => {
      const res = await deleteTask(taskId);
      if (!res.ok) {
        setError(res.error ?? "Could not delete");
        setConfirming(false);
        return;
      }
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-xs text-[#943B13]">Delete?</span>
        <button
          onClick={remove}
          disabled={pending}
          className="rounded-lg bg-[#e2445c] px-2.5 py-1 text-xs font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
        >
          {pending ? "…" : "Yes"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="rounded-lg bg-[#F0EBF0] px-2.5 py-1 text-xs font-semibold text-[#440E48] hover:bg-[#E4DDE4]"
        >
          No
        </button>
      </span>
    );
  }

  if (compact) {
    return (
      <button
        onClick={() => setConfirming(true)}
        title="Delete task"
        aria-label="Delete task"
        className="rounded-lg p-1.5 text-[#A19BA2] transition hover:bg-[#FFF0EE] hover:text-[#e2445c]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-[#e2445c] px-3 py-1.5 text-sm font-semibold text-[#e2445c] transition hover:bg-[#FFF0EE]"
      >
        Delete task
      </button>
      {error && <span className="text-xs font-medium text-[#943B13]">{error}</span>}
    </div>
  );
}
