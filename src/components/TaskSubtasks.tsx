"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSubtask, toggleSubtask, deleteSubtask } from "@/lib/subtasks";

type Subtask = { id: string; title: string; done: boolean };

export function TaskSubtasks({
  taskId,
  subtasks,
  canManage,
}: {
  taskId: string;
  subtasks: Subtask[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const done = subtasks.filter((s) => s.done).length;
  const pct = subtasks.length ? Math.round((done / subtasks.length) * 100) : 0;

  function add() {
    if (!title.trim()) return;
    setError(null);
    start(async () => {
      const res = await addSubtask(taskId, title);
      if (!res.ok) return setError(res.error ?? "Failed");
      setTitle("");
      router.refresh();
    });
  }
  function toggle(id: string) {
    start(async () => {
      const res = await toggleSubtask(id);
      if (!res.ok) setError(res.error ?? "Failed");
      router.refresh();
    });
  }
  function remove(id: string) {
    start(async () => {
      await deleteSubtask(id);
      router.refresh();
    });
  }

  return (
    <div className="m-card p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#726973]">
          Subtasks {subtasks.length > 0 && `· ${done}/${subtasks.length}`}
        </h2>
        {subtasks.length > 0 && <span className="text-xs font-semibold text-[#440E48]">{pct}%</span>}
      </div>

      {subtasks.length > 0 && (
        <>
          <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-[#F0EBF0]">
            <div className="h-full rounded-full bg-[#1DBA87] transition-all" style={{ width: `${pct}%` }} />
          </div>
          <ul className="mb-4 space-y-1">
            {subtasks.map((s) => (
              <li key={s.id} className="group flex items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-[#F9F6F9]">
                <button
                  onClick={() => toggle(s.id)}
                  disabled={pending}
                  aria-label={s.done ? "Mark not done" : "Mark done"}
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${
                    s.done ? "border-[#1DBA87] bg-[#1DBA87] text-white" : "border-[#C4BCC5] hover:border-[#440E48]"
                  }`}
                >
                  {s.done && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
                <span className={`flex-1 text-sm ${s.done ? "text-[#A19BA2] line-through" : "text-[#140516]"}`}>
                  {s.title}
                </span>
                {canManage && (
                  <button
                    onClick={() => remove(s.id)}
                    disabled={pending}
                    aria-label="Delete subtask"
                    className="opacity-0 transition group-hover:opacity-100 text-[#A19BA2] hover:text-[#943B13]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {canManage && (
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Add a subtask…"
            className="flex-1 rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm outline-none focus:border-[#440E48]"
          />
          <button
            onClick={add}
            disabled={pending || !title.trim()}
            className="rounded-lg bg-[#F0EBF0] px-4 py-2 text-sm font-semibold text-[#440E48] hover:bg-[#E4DDE4] disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}
      {subtasks.length === 0 && !canManage && <p className="text-sm text-[#A19BA2]">No subtasks.</p>}
      {error && <p className="mt-2 text-sm font-medium text-[#943B13]">{error}</p>}
    </div>
  );
}
