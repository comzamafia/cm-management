"use client";

import { useTransition, useState } from "react";
import { toggleTemplate } from "@/lib/checklists";

export function ToggleTemplateButton({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => { void toggleTemplate(id); })}
      className={`rounded-md px-3 py-1 text-xs font-medium disabled:opacity-50 ${
        active
          ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
          : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
      }`}
    >
      {active ? "Deactivate" : "Activate"}
    </button>
  );
}

export function GenerateNowButton() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/cron/generate-checklists?force=1");
      const data = (await res.json()) as { tasksCreated: number; templatesRun: number };
      setResult(`Generated ${data.tasksCreated} task(s) from ${data.templatesRun} template(s).`);
    } finally {
      setPending(false);
      // Reload the page so task counts update.
      setTimeout(() => { window.location.reload(); }, 1200);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {result && <span className="text-xs text-emerald-600">{result}</span>}
      <button
        onClick={run}
        disabled={pending}
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {pending ? "Generating…" : "Generate Now"}
      </button>
    </div>
  );
}
