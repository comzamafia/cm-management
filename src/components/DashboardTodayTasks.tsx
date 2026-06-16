"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Priority, TaskStatus } from "@prisma/client";
import { changeTaskStatus, assignTask } from "@/lib/tasks";
import { generateNow } from "@/lib/checklists";
import { PRIORITY_LABEL, PRIORITY_STYLE, STATUS_LABEL, STATUS_STYLE } from "@/lib/labels";

export type TodayTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  categoryName: string | null;
  categoryColor: string | null;
  locationName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  dueAt: string | null;
  proofRequired: boolean;
};
export type PendingChecklist = { key: string; title: string; templateName: string };
type UserOpt = { id: string; name: string };

function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function DashboardTodayTasks({
  tasks,
  pending,
  users,
  canEdit,
}: {
  tasks: TodayTask[];
  pending: PendingChecklist[];
  users: UserOpt[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const run = (key: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(key);
    startTransition(async () => {
      const res = await fn();
      setBusy(null);
      if (!res.ok) setErr(res.error ?? "Something went wrong");
      else { setErr(null); router.refresh(); }
    });
  };

  const complete = (t: TodayTask) => {
    if (t.proofRequired) { setErr(`"${t.title}" needs photo proof — open the task to complete it.`); return; }
    run(t.id, () => changeTaskStatus(t.id, "DONE"));
  };

  return (
    <section className="m-card lg:col-span-3">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-[#440E48]"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
          <h2 className="text-base font-bold text-[#140516]">Today&apos;s Tasks</h2>
          <span className="text-sm text-[#A19BA2]">· {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
        </div>
        <Link href="/tasks?mine=1" className="rounded-lg border border-[#E4DDE4] px-3 py-1.5 text-xs font-semibold text-[#726973] hover:bg-[#FAF6FA]">View all my tasks</Link>
      </div>

      {err && <div className="mx-5 mb-2 rounded-lg border border-[#f3d3d8] bg-[#fdf2f3] px-3 py-2 text-xs font-medium text-[#e2445c]">{err}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-y border-[#eee] bg-[#faf8fa] text-left text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">
            <tr>
              <th className="px-5 py-2">Task</th>
              <th className="px-3 py-2 w-28">Category</th>
              <th className="px-3 py-2 w-40">Owner</th>
              <th className="px-3 py-2 w-28">Status</th>
              <th className="px-3 py-2 w-24">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3eef3]">
            {tasks.map((t) => (
              <tr key={t.id} className="hover:bg-[#faf8fa]">
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-3">
                    <button onClick={() => complete(t)} disabled={busy === t.id} title="Mark done"
                      className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 border-[#D0CDD0] text-transparent transition-colors hover:border-[#1DBA87] hover:text-[#1DBA87] disabled:opacity-50">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                    <Link href={`/tasks/${t.id}`} className="font-medium text-[#140516] hover:text-[#440E48]">{t.title}</Link>
                    <Link href={`/tasks/${t.id}#comments`} title="Comment" className="shrink-0 text-[#C9C4C9] hover:text-[#440E48]">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </Link>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  {t.categoryName ? (
                    <span className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${t.categoryColor ?? "#440E48"}1a`, color: t.categoryColor ?? "#440E48" }}>{t.categoryName}</span>
                  ) : <span className="text-[#C9C4C9]">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  {canEdit ? (
                    <div className="flex items-center gap-1.5">
                      {t.assigneeName
                        ? <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#440E48] text-[9px] font-bold text-white" title={t.assigneeName}>{initials(t.assigneeName)}</span>
                        : <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#eee] text-[9px] text-[#A19BA2]">—</span>}
                      <select value={t.assigneeId ?? ""} disabled={busy === t.id}
                        onChange={(e) => run(t.id, () => assignTask(t.id, e.target.value))}
                        className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-1 text-xs text-[#726973] outline-none hover:border-[#E4DDE4] focus:border-[#440E48]">
                        <option value="">Unassigned</option>
                        {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-[#726973]">{t.assigneeName ?? "—"}</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${STATUS_STYLE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${PRIORITY_STYLE[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span>
                </td>
              </tr>
            ))}

            {/* Should-do-today items from checklists not yet generated */}
            {pending.map((p) => (
              <tr key={p.key} className="bg-[#fbfaff]">
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 border-dashed border-[#C9C4C9]" />
                    <span className="text-[#433745]">{p.title}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5"><span className="inline-flex rounded-md bg-[#5B8DD91a] px-2 py-0.5 text-[11px] font-semibold text-[#5B8DD9]">Checklist</span></td>
                <td className="px-3 py-2.5 text-xs text-[#A19BA2]" title={p.templateName}>{p.templateName}</td>
                <td className="px-3 py-2.5"><span className="text-[11px] italic text-[#A19BA2]">Not started</span></td>
                <td className="px-3 py-2.5 text-[#C9C4C9]">—</td>
              </tr>
            ))}

            {tasks.length === 0 && pending.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-[#A19BA2]">Nothing due today. 🎉</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-5 py-3">
        <Link href="/tasks/new" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#440E48] hover:underline">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Task
        </Link>
        {canEdit && pending.length > 0 && (
          <button onClick={() => run("gen", generateNow)} disabled={busy === "gen"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#440E48] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5A1560] disabled:opacity-60">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
            {busy === "gen" ? "Generating…" : "Generate today's checklist tasks"}
          </button>
        )}
      </div>
    </section>
  );
}
