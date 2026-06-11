"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTask } from "@/lib/tasks";

export function DeleteTaskButton({ taskId }: { taskId: string }) {
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
      router.push("/tasks");
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#943B13]">Delete permanently?</span>
        <button
          onClick={remove}
          disabled={pending}
          className="rounded-lg bg-[#e2445c] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="rounded-lg bg-[#F0EBF0] px-3 py-1.5 text-sm font-semibold text-[#440E48] hover:bg-[#E4DDE4]"
        >
          Cancel
        </button>
      </div>
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
