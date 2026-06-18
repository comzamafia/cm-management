"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TaskStatus } from "@prisma/client";
import { StatusBadge, PriorityBadge } from "@/components/Badge";
import { DeleteTaskButton } from "@/components/DeleteTaskButton";
import { STATUS_LABEL, formatDueRelative } from "@/lib/labels";
import { bulkTaskAction } from "@/lib/tasks";

export type TaskRow = {
  id: string;
  title: string;
  locationName: string;
  assigneeName: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  derivedStatus: TaskStatus;
  dueAt: string | null;
  proofRequired: boolean;
};

const STATUS_HEX: Record<TaskStatus, string> = {
  PENDING: "#A19BA2",
  IN_PROGRESS: "#F4A626",
  DONE: "#1DBA87",
  VERIFIED: "#440E48",
  OVERDUE: "#e2445c",
};

const BULK_STATUSES: TaskStatus[] = ["PENDING", "IN_PROGRESS", "DONE", "VERIFIED"];

export function TaskTable({
  tasks,
  canManage,
  assignees,
  emptyMessage,
}: {
  tasks: TaskRow[];
  canManage: boolean;
  assignees: { id: string; name: string }[];
  emptyMessage: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const allSelected = tasks.length > 0 && selected.size === tasks.length;
  const colCount = canManage ? 7 : 6;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(tasks.map((t) => t.id)));
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) return setError(res.error ?? "Action failed");
      setSelected(new Set());
      router.refresh();
    });
  }

  const ids = [...selected];

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {canManage && selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl bg-[#440E48] px-4 py-2.5 text-white shadow-lg">
          <span className="text-sm font-semibold">{selected.size} selected</span>
          <span className="mx-1 h-4 w-px bg-white/25" />

          <select
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value as TaskStatus;
              if (v) run(() => bulkTaskAction({ ids, action: "status", status: v }));
              e.target.value = "";
            }}
            disabled={pending}
            className="rounded-lg bg-white/15 px-2.5 py-1.5 text-sm text-white outline-none [&>option]:text-[#140516]"
          >
            <option value="">Set status…</option>
            {BULK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>

          <select
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) run(() => bulkTaskAction({ ids, action: "assign", assigneeId: v === "__none" ? null : v }));
              e.target.value = "";
            }}
            disabled={pending}
            className="rounded-lg bg-white/15 px-2.5 py-1.5 text-sm text-white outline-none [&>option]:text-[#140516]"
          >
            <option value="">Assign to…</option>
            <option value="__none">Unassign</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => run(() => bulkTaskAction({ ids, action: "delete" }))}
            disabled={pending}
            className="rounded-lg bg-[#e2445c] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
          >
            Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-sm text-white/70 hover:text-white">
            Clear
          </button>
        </div>
      )}
      {error && <p className="text-sm font-medium text-[#943B13]">{error}</p>}

      {/* Desktop table */}
      <div className="m-card hidden overflow-x-auto md:block">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-[#E4DDE4] bg-[#F9F6F9] text-left text-xs font-semibold uppercase tracking-wider text-[#726973]">
            <tr>
              {canManage && (
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" className="accent-[#440E48]" />
                </th>
              )}
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Assignee</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Status</th>
              {canManage && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EBF0]">
            {tasks.map((t) => (
              <tr key={t.id} className={`group transition-colors hover:bg-[#F9F6F9] ${selected.has(t.id) ? "bg-[#FAF6FA]" : ""}`}>
                {canManage && (
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} aria-label={`Select ${t.title}`} className="accent-[#440E48]" />
                  </td>
                )}
                <td className="py-3 pl-0 pr-4">
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-1.5 shrink-0 rounded-r" style={{ backgroundColor: STATUS_HEX[t.derivedStatus] }} />
                    <Link href={`/tasks/${t.id}`} className="font-semibold text-[#140516] group-hover:text-[#440E48]">
                      {t.title}
                    </Link>
                    {t.proofRequired && <span className="text-xs text-[#F4A626]" title="Photo proof required">📷</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-[#726973]">{t.locationName}</td>
                <td className="px-4 py-3 text-[#726973]">{t.assigneeName ?? "—"}</td>
                <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                <td className={`px-4 py-3 ${t.derivedStatus === "OVERDUE" ? "font-semibold text-[#e2445c]" : "text-[#726973]"}`}>{formatDueRelative(t.dueAt)}</td>
                <td className="px-4 py-3"><StatusBadge status={t.derivedStatus} /></td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/tasks/${t.id}`} title="Open / edit" className="rounded-lg p-1.5 text-[#A19BA2] transition hover:bg-[#F0EBF0] hover:text-[#440E48]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </Link>
                      <DeleteTaskButton taskId={t.id} compact />
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-12 text-center text-[#A19BA2]">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2.5 md:hidden">
        {tasks.map((t) => (
          <div
            key={t.id}
            className={`m-card p-3.5 ${selected.has(t.id) ? "ring-2 ring-[#440E48]/30" : ""}`}
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-1 h-8 w-1.5 shrink-0 rounded-r" style={{ backgroundColor: STATUS_HEX[t.derivedStatus] }} />
              {canManage && (
                <input
                  type="checkbox"
                  checked={selected.has(t.id)}
                  onChange={() => toggle(t.id)}
                  aria-label={`Select ${t.title}`}
                  className="mt-1 accent-[#440E48]"
                />
              )}
              <div className="min-w-0 flex-1">
                <Link href={`/tasks/${t.id}`} className="block font-semibold leading-snug text-[#140516]">
                  {t.title}
                  {t.proofRequired && <span className="ml-1 text-xs text-[#F4A626]" title="Photo proof required">📷</span>}
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={t.derivedStatus} />
                  <PriorityBadge priority={t.priority} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#726973]">
                  <span>{t.locationName}</span>
                  <span>· {t.assigneeName ?? "Unassigned"}</span>
                  <span className={t.derivedStatus === "OVERDUE" ? "font-semibold text-[#e2445c]" : ""}>· {formatDueRelative(t.dueAt)}</span>
                </div>
              </div>
              {canManage && <DeleteTaskButton taskId={t.id} compact />}
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="m-card px-4 py-12 text-center text-[#A19BA2]">{emptyMessage}</div>
        )}
      </div>
    </div>
  );
}
