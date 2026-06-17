"use client";

import { useTransition, useState } from "react";
import { toggleTemplate, assignChecklistTemplate } from "@/lib/checklists";

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

type UserOpt = { id: string; name: string };

export function AssignTemplateSelect({
  templateId,
  assigneeId,
  assigneeName,
  users,
}: {
  templateId: string;
  assigneeId: string | null;
  assigneeName: string | null;
  users: UserOpt[];
}) {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState(assigneeId ?? "");

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCurrent(val);
    startTransition(async () => {
      await assignChecklistTemplate(templateId, val || null);
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#726973]">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
      <select
        value={current}
        onChange={handleChange}
        disabled={pending}
        className="rounded-md border border-[#E4DDE4] bg-white px-2 py-1 text-xs text-[#140516] outline-none transition focus:border-[#440E48] disabled:opacity-50"
      >
        <option value="">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
      {pending && <span className="text-[10px] text-[#A19BA2]">Saving…</span>}
    </div>
  );
}
