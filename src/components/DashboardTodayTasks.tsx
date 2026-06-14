"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Priority, TaskStatus } from "@prisma/client";
import { changeTaskStatus } from "@/lib/tasks";
import { PRIORITY_LABEL, PRIORITY_STYLE } from "@/lib/labels";

export type TodayTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  categoryName: string | null;
  categoryColor: string | null;
  locationName: string;
  assigneeName: string | null;
  dueAt: string | null;
  proofRequired: boolean;
};

function dueLabel(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const days = Math.floor((d.setHours(0, 0, 0, 0) - t.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days < 0) return `${-days}d late`;
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short" });
}

export function DashboardTodayTasks({ tasks }: { tasks: TodayTask[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const complete = (t: TodayTask) => {
    if (t.proofRequired) {
      setErr(`"${t.title}" needs photo proof — open the task to complete it.`);
      return;
    }
    setBusy(t.id);
    startTransition(async () => {
      const res = await changeTaskStatus(t.id, "DONE");
      setBusy(null);
      if (!res.ok) setErr(res.error ?? "Could not complete the task");
      else { setErr(null); router.refresh(); }
    });
  };

  return (
    <section className="m-card lg:col-span-3">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-[#440E48]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </span>
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
              <th className="px-3 py-2 w-32">Category</th>
              <th className="px-3 py-2 w-28">Location</th>
              <th className="px-3 py-2 w-24">Due</th>
              <th className="px-3 py-2 w-24">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3eef3]">
            {tasks.map((t) => (
              <tr key={t.id} className="hover:bg-[#faf8fa]">
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => complete(t)}
                      disabled={busy === t.id}
                      title="Mark done"
                      className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 border-[#D0CDD0] text-transparent transition-colors hover:border-[#1DBA87] hover:text-[#1DBA87]"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                    <Link href={`/tasks/${t.id}`} className="font-medium text-[#140516] hover:text-[#440E48]">{t.title}</Link>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  {t.categoryName ? (
                    <span className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${t.categoryColor ?? "#440E48"}1a`, color: t.categoryColor ?? "#440E48" }}>{t.categoryName}</span>
                  ) : <span className="text-[#C9C4C9]">—</span>}
                </td>
                <td className="px-3 py-2.5 text-[#726973]">{t.locationName}</td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${dueLabel(t.dueAt).endsWith("late") ? "text-[#e2445c]" : "text-[#726973]"}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {dueLabel(t.dueAt)}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${PRIORITY_STYLE[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-[#A19BA2]">Nothing due today. 🎉</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3">
        <Link href="/tasks/new" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#440E48] hover:underline">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Task
        </Link>
      </div>
    </section>
  );
}
