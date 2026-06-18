"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TaskStatus } from "@prisma/client";
import { StatusBadge, PriorityBadge } from "@/components/Badge";
import { DeleteTaskButton } from "@/components/DeleteTaskButton";
import { STATUS_LABEL, formatDueRelative } from "@/lib/labels";
import { bulkTaskAction, changeTaskStatus } from "@/lib/tasks";

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

// Column sort indicator
function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active)
    return (
      <span className="text-[#D0CCD0] text-[10px] select-none">↕</span>
    );
  return (
    <span className="text-[#440E48] text-[10px] select-none">{dir === "asc" ? "↑" : "↓"}</span>
  );
}

export function TaskTable({
  tasks,
  canManage,
  assignees,
  sort,
  sortDir = "asc",
  emptyMessage,
}: {
  tasks: TaskRow[];
  canManage: boolean;
  assignees: { id: string; name: string }[];
  sort?: string;
  sortDir?: "asc" | "desc";
  emptyMessage: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [activeQuickDone, setActiveQuickDone] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const allSelected = tasks.length > 0 && selected.size === tasks.length;
  // checkbox + task + branch + assignee + priority + due + status + actions
  const colCount = canManage ? 8 : 7;

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

  function quickDone(id: string) {
    setActiveQuickDone(id);
    setRowErrors((prev) => { const n = { ...prev }; delete n[id]; return n; });
    start(async () => {
      const res = await changeTaskStatus(id, "DONE");
      setActiveQuickDone(null);
      if (!res.ok) {
        setRowErrors((prev) => ({ ...prev, [id]: res.error ?? "Failed" }));
        return;
      }
      router.refresh();
    });
  }

  function handleSort(col: string) {
    const next = new URLSearchParams(params.toString());
    const isActive = sort === col;
    const newDir = isActive && sortDir === "asc" ? "desc" : "asc";
    next.set("sort", col);
    if (newDir === "desc") next.set("dir", "desc"); else next.delete("dir");
    router.push(`/tasks?${next.toString()}`);
  }

  const ids = [...selected];

  function SortableTh({ col, label }: { col: string; label: string }) {
    return (
      <th className="px-4 py-3">
        <button
          onClick={() => handleSort(col)}
          className="flex items-center gap-1 hover:text-[#440E48] transition-colors"
        >
          {label}
          <SortIcon active={sort === col} dir={sortDir ?? "asc"} />
        </button>
      </th>
    );
  }

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
              if (v)
                run(() =>
                  bulkTaskAction({ ids, action: "assign", assigneeId: v === "__none" ? null : v })
                );
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
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-[#E4DDE4] bg-[#F9F6F9] text-left text-xs font-semibold uppercase tracking-wider text-[#726973]">
            <tr>
              {canManage && (
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all"
                    className="accent-[#440E48]"
                  />
                </th>
              )}
              <SortableTh col="title" label="Task" />
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Assignee</th>
              <SortableTh col="priority" label="Priority" />
              <SortableTh col="due" label="Due" />
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EBF0]">
            {tasks.map((t) => {
              const canDone = t.derivedStatus !== "DONE" && t.derivedStatus !== "VERIFIED";
              const isDoing = activeQuickDone === t.id;
              const rowError = rowErrors[t.id];
              return (
                <tr
                  key={t.id}
                  className={`group transition-colors hover:bg-[#F9F6F9] ${selected.has(t.id) ? "bg-[#FAF6FA]" : ""}`}
                >
                  {canManage && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(t.id)}
                        onChange={() => toggle(t.id)}
                        aria-label={`Select ${t.title}`}
                        className="accent-[#440E48]"
                      />
                    </td>
                  )}
                  <td className="py-3 pl-0 pr-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-9 w-1.5 shrink-0 rounded-r"
                        style={{ backgroundColor: STATUS_HEX[t.derivedStatus] }}
                      />
                      <Link
                        href={`/tasks/${t.id}`}
                        className="font-semibold text-[#140516] group-hover:text-[#440E48]"
                      >
                        {t.title}
                      </Link>
                      {t.proofRequired && (
                        <span className="text-xs text-[#F4A626]" title="Photo proof required">
                          📷
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#726973]">{t.locationName}</td>
                  <td className="px-4 py-3 text-[#726973]">{t.assigneeName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td
                    className={`px-4 py-3 ${
                      t.derivedStatus === "OVERDUE"
                        ? "font-semibold text-[#e2445c]"
                        : "text-[#726973]"
                    }`}
                  >
                    {formatDueRelative(t.dueAt)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.derivedStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Quick Done button */}
                      {canDone && (
                        t.proofRequired ? (
                          <Link
                            href={`/tasks/${t.id}`}
                            title="Photo proof required — open task to complete"
                            className="rounded-lg p-1.5 text-[#F4A626] transition hover:bg-[#FFF7E6]"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                            </svg>
                          </Link>
                        ) : (
                          <button
                            onClick={() => quickDone(t.id)}
                            disabled={isDoing || pending}
                            title={rowError ? `Error: ${rowError}` : "Mark Done"}
                            className={`rounded-lg p-1.5 transition ${
                              rowError
                                ? "text-[#e2445c] hover:bg-[#FFF0EE]"
                                : "text-[#1DBA87] hover:bg-[#E8FBF5]"
                            } disabled:opacity-40`}
                          >
                            {isDoing ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                              </svg>
                            ) : rowError ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                          </button>
                        )
                      )}
                      {canManage && (
                        <>
                          <Link
                            href={`/tasks/${t.id}`}
                            title="Open / edit"
                            className="rounded-lg p-1.5 text-[#A19BA2] transition hover:bg-[#F0EBF0] hover:text-[#440E48]"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </Link>
                          <DeleteTaskButton taskId={t.id} compact />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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
        {tasks.map((t) => {
          const canDone = t.derivedStatus !== "DONE" && t.derivedStatus !== "VERIFIED";
          const isDoing = activeQuickDone === t.id;
          const rowError = rowErrors[t.id];
          return (
            <div
              key={t.id}
              className={`m-card p-3.5 ${selected.has(t.id) ? "ring-2 ring-[#440E48]/30" : ""}`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-1 h-8 w-1.5 shrink-0 rounded-r"
                  style={{ backgroundColor: STATUS_HEX[t.derivedStatus] }}
                />
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
                    {t.proofRequired && (
                      <span className="ml-1 text-xs text-[#F4A626]" title="Photo proof required">
                        📷
                      </span>
                    )}
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={t.derivedStatus} />
                    <PriorityBadge priority={t.priority} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#726973]">
                    <span>{t.locationName}</span>
                    <span>· {t.assigneeName ?? "Unassigned"}</span>
                    <span className={t.derivedStatus === "OVERDUE" ? "font-semibold text-[#e2445c]" : ""}>
                      · {formatDueRelative(t.dueAt)}
                    </span>
                  </div>
                  {rowError && (
                    <p className="mt-1.5 text-xs text-[#e2445c]">{rowError}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {canDone && (
                    t.proofRequired ? (
                      <Link
                        href={`/tasks/${t.id}`}
                        title="Photo proof required"
                        className="rounded-lg p-1.5 text-[#F4A626] hover:bg-[#FFF7E6]"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                        </svg>
                      </Link>
                    ) : (
                      <button
                        onClick={() => quickDone(t.id)}
                        disabled={isDoing || pending}
                        title={rowError ? `Error: ${rowError}` : "Mark Done"}
                        className={`rounded-lg p-1.5 transition ${
                          rowError
                            ? "text-[#e2445c] hover:bg-[#FFF0EE]"
                            : "text-[#1DBA87] hover:bg-[#E8FBF5]"
                        } disabled:opacity-40`}
                      >
                        {isDoing ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    )
                  )}
                  {canManage && <DeleteTaskButton taskId={t.id} compact />}
                </div>
              </div>
            </div>
          );
        })}
        {tasks.length === 0 && (
          <div className="m-card px-4 py-12 text-center text-[#A19BA2]">{emptyMessage}</div>
        )}
      </div>
    </div>
  );
}
