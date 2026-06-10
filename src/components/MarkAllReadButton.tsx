"use client";

import { useTransition } from "react";
import { markAllRead } from "@/lib/notifications";

export function MarkAllReadButton({ count }: { count: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => { void markAllRead(); })}
      className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
    >
      {pending ? "Marking…" : `Mark all read (${count})`}
    </button>
  );
}
