"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TaskStatus } from "@prisma/client";
import {
  markServiced,
  toggleComplianceActive,
  deleteComplianceSchedule,
  updateComplianceSchedule,
  addComplianceComment,
  deleteComplianceComment,
} from "@/lib/compliance";
import {
  COMPLIANCE_CATEGORY_LABEL,
  COMPLIANCE_INTERVAL_LABEL,
  COMPLIANCE_STATUS_LABEL,
  COMPLIANCE_STATUS_HEX,
  PRIORITY_LABEL,
  STATUS_LABEL,
  STATUS_STYLE,
  complianceDaysUntil,
  deriveComplianceStatus,
} from "@/lib/labels";

type UserOpt = { id: string; name: string };
type Action = () => Promise<{ ok: boolean; error?: string }>;

function money(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
function fmtDate(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateTime(iso: string | Date) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}
function dueText(days: number) {
  if (days < 0) return `${-days}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `In ${days}d`;
}
function actionLabel(action: string) {
  const map: Record<string, string> = {
    "compliance.created": "Schedule created",
    "compliance.serviced": "Marked as serviced",
    "compliance.updated": "Schedule updated",
    "compliance.commented": "Added a comment",
    "compliance.deleted": "Schedule deleted",
  };
  return map[action] ?? action;
}

const TASK_STATUS_HEX: Record<TaskStatus, string> = {
  PENDING: "#A19BA2", IN_PROGRESS: "#F4A626", DONE: "#1DBA87", VERIFIED: "#440E48", OVERDUE: "#e2445c",
};

type Schedule = {
  id: string;
  name: string;
  category: import("@prisma/client").ComplianceCategory;
  interval: import("@prisma/client").ComplianceInterval;
  priority: import("@prisma/client").Priority;
  active: boolean;
  vendor: string | null;
  vendorContact: string | null;
  estimatedCost: number | null;
  lastCost: number | null;
  notes: string | null;
  lastServiceDate: Date;
  nextDueDate: Date;
  locationId: string;
  assigneeId: string | null;
  currentTaskId: string | null;
  location: { id: string; name: string };
  assignee: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  currentTask: {
    id: string; title: string; status: TaskStatus; dueAt: Date | null;
    assignee: { id: string; name: string } | null;
  } | null;
  tasks: Array<{
    id: string; status: TaskStatus; dueAt: Date | null; createdAt: Date;
    completions: Array<{ completedAt: Date; completedBy: { name: string } }>;
  }>;
  comments: Array<{
    id: string; body: string; createdAt: Date;
    user: { id: string; name: string };
  }>;
};

type ActivityEntry = {
  id: string; action: string; meta: unknown; timestamp: Date;
  user: { id: string; name: string };
};

export function ComplianceDetail({
  schedule,
  activity,
  users,
  canEdit,
  currentUserId,
}: {
  schedule: Schedule;
  activity: ActivityEntry[];
  users: UserOpt[];
  canEdit: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const complianceStatus = schedule.active
    ? deriveComplianceStatus(schedule.nextDueDate)
    : ("UPCOMING" as const);
  const daysUntil = complianceDaysUntil(schedule.nextDueDate);

  function run(fn: Action) {
    setErr(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setErr(res.error ?? "Something went wrong");
      router.refresh();
    });
  }

  async function submitComment() {
    const body = draft.trim();
    if (!body) return;
    setSubmitting(true);
    setErr(null);
    const res = await addComplianceComment(schedule.id, body);
    setSubmitting(false);
    if (!res.ok) { setErr(res.error ?? "Failed"); return; }
    setDraft("");
    router.refresh();
  }

  // Past cycles = tasks excluding the current one
  const pastCycles = schedule.tasks.filter((t) => t.id !== schedule.currentTaskId);

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-lg border border-[#f3d3d8] bg-[#fdf2f3] px-4 py-2 text-sm font-medium text-[#e2445c]">
          {err}
        </div>
      )}

      {/* Header card */}
      <div className="m-card overflow-hidden">
        <div
          className="h-1.5 w-full"
          style={{ backgroundColor: COMPLIANCE_STATUS_HEX[complianceStatus] }}
        />
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                  style={{ backgroundColor: COMPLIANCE_STATUS_HEX[complianceStatus] }}
                >
                  {COMPLIANCE_STATUS_LABEL[complianceStatus]}
                </span>
                <span className="rounded-full bg-[#F0EBF0] px-2.5 py-0.5 text-xs font-semibold text-[#440E48]">
                  {COMPLIANCE_CATEGORY_LABEL[schedule.category]}
                </span>
                <span className="text-xs text-[#A19BA2]">
                  {COMPLIANCE_INTERVAL_LABEL[schedule.interval]}
                </span>
                {!schedule.active && (
                  <span className="rounded-full bg-[#F0EBF0] px-2.5 py-0.5 text-xs font-semibold text-[#726973]">
                    Paused
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-2xl font-bold text-[#140516]">{schedule.name}</h1>
              <p className="mt-1 text-sm text-[#726973]">
                {schedule.location.name} · Priority: {PRIORITY_LABEL[schedule.priority]}
              </p>
            </div>

            {canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => run(() => toggleComplianceActive(schedule.id))}
                  className="rounded-lg border border-[#E4DDE4] px-3 py-1.5 text-sm font-medium text-[#726973] hover:bg-[#F0EBF0]"
                >
                  {schedule.active ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${schedule.name}"? Its history tasks are kept but unlinked.`))
                      start(async () => {
                        const res = await deleteComplianceSchedule(schedule.id);
                        if (res.ok) router.push("/compliance");
                        else setErr(res.error ?? "Failed");
                      });
                  }}
                  className="rounded-lg border border-[#f3d3d8] px-3 py-1.5 text-sm font-medium text-[#e2445c] hover:bg-[#fdf2f3]"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two-column info + Mark Done */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Service status card */}
        <div className="m-card p-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">Service Status</h2>
          <div
            className="mb-1 text-2xl font-extrabold"
            style={{ color: COMPLIANCE_STATUS_HEX[complianceStatus] }}
          >
            {dueText(daysUntil)}
          </div>
          <div className="mb-4 text-sm text-[#726973]">Next due: <span className="font-semibold text-[#140516]">{fmtDate(schedule.nextDueDate.toISOString())}</span></div>

          {canEdit && schedule.active && (
            <MarkDonePanel schedule={schedule} run={run} />
          )}
        </div>

        {/* Schedule details */}
        <div className="m-card p-5 md:col-span-2">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Detail label="Last service" value={fmtDate(schedule.lastServiceDate.toISOString())} />
            <Detail label="Frequency" value={COMPLIANCE_INTERVAL_LABEL[schedule.interval]} />
            <Detail label="Vendor" value={schedule.vendor ?? "—"} />
            <Detail label="Contact" value={schedule.vendorContact ?? "—"} />
            <Detail label="Est. cost" value={money(schedule.estimatedCost)} />
            <Detail label="Last cost" value={money(schedule.lastCost)} />
            <div className="col-span-2">
              <DetailLabel>Assignee</DetailLabel>
              {canEdit ? (
                <select
                  value={schedule.assigneeId ?? ""}
                  onChange={(e) => run(() => updateComplianceSchedule(schedule.id, { assigneeId: e.target.value || null }))}
                  className="mt-0.5 w-full rounded-lg border border-[#E4DDE4] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#440E48]"
                >
                  <option value="">— Unassigned —</option>
                  {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                </select>
              ) : (
                <div className="mt-0.5 text-[#140516]">{schedule.assignee?.name ?? "—"}</div>
              )}
            </div>
            {schedule.notes && (
              <div className="col-span-2">
                <DetailLabel>Notes</DetailLabel>
                <p className="mt-0.5 whitespace-pre-wrap text-[#433745]">{schedule.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current cycle task */}
      {schedule.currentTask && (
        <div className="m-card p-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">Current Cycle Task</h2>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E4DDE4] bg-[#FAF6FA] px-4 py-3">
            <span
              className="h-8 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: TASK_STATUS_HEX[schedule.currentTask.status] }}
            />
            <div className="flex-1 min-w-0">
              <Link href={`/tasks/${schedule.currentTask.id}`} className="font-semibold text-[#140516] hover:text-[#440E48]">
                {schedule.currentTask.title}
              </Link>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#726973]">
                <span>Assignee: {schedule.currentTask.assignee?.name ?? "Unassigned"}</span>
                {schedule.currentTask.dueAt && (
                  <span>· Due: {fmtDate(schedule.currentTask.dueAt)}</span>
                )}
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${STATUS_STYLE[schedule.currentTask.status]}`}>
              {STATUS_LABEL[schedule.currentTask.status]}
            </span>
            <Link href={`/tasks/${schedule.currentTask.id}`} className="shrink-0 rounded-lg border border-[#E4DDE4] px-3 py-1.5 text-xs font-semibold text-[#440E48] hover:bg-[#F0EBF0]">
              Open task →
            </Link>
          </div>
        </div>
      )}

      {/* Comments + Activity */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Comments */}
        <section className="m-card p-5 lg:col-span-3">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#726973]">
            Comments ({schedule.comments.length})
          </h2>

          <div className="mb-4">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submitComment(); }}
              rows={2}
              placeholder="Add an update… (e.g. Called vendor, appointment scheduled)"
              className="w-full resize-none rounded-xl border border-[#E4DDE4] px-3 py-2 text-sm text-[#140516] placeholder-[#A19BA2] outline-none focus:border-[#440E48] focus:ring-2 focus:ring-[#440E48]/10"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-[#A19BA2]">⌘/Ctrl + Enter</span>
              <button
                onClick={submitComment}
                disabled={submitting || !draft.trim()}
                className="m-btn px-4 py-1.5 text-sm disabled:opacity-50"
              >
                {submitting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>

          {schedule.comments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#E4DDE4] py-6 text-center text-sm text-[#A19BA2]">
              No comments yet. Add one above.
            </div>
          ) : (
            <ul className="space-y-3">
              {schedule.comments.map((c) => (
                <li key={c.id} className="group flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#440E48] text-[11px] font-bold text-white">
                    {c.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#140516]">{c.user.name}</span>
                      <span className="text-[11px] text-[#A19BA2]">{fmtDateTime(c.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-[#433745]">{c.body}</p>
                  </div>
                  {(c.user.id === currentUserId || canEdit) && (
                    <button
                      onClick={() => run(() => deleteComplianceComment(c.id))}
                      aria-label="Delete comment"
                      className="shrink-0 text-[#C9C4C9] opacity-0 transition hover:text-[#e2445c] group-hover:opacity-100"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Activity + Past cycles */}
        <div className="space-y-4 lg:col-span-2">
          {/* Activity feed */}
          <section className="m-card p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">Activity Log</h2>
            {activity.length === 0 ? (
              <div className="text-sm text-[#A19BA2]">No activity recorded.</div>
            ) : (
              <ul className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#440E48]" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-[#140516]">{actionLabel(a.action)}</div>
                      <div className="mt-0.5 text-[11px] text-[#A19BA2]">
                        {a.user.name} · {fmtDateTime(a.timestamp)}
                      </div>
                      {a.action === "compliance.serviced" && typeof a.meta === "object" && a.meta !== null && (
                        <div className="mt-0.5 text-[11px] text-[#726973]">
                          {"nextDueDate" in a.meta ? `Next due: ${fmtDate((a.meta as Record<string, unknown>).nextDueDate as string)}` : ""}
                          {"cost" in a.meta && (a.meta as Record<string, unknown>).cost != null
                            ? ` · Cost: ${money((a.meta as Record<string, unknown>).cost as number)}`
                            : ""}
                        </div>
                      )}
                      {a.action === "compliance.commented" && typeof a.meta === "object" && a.meta !== null && "excerpt" in a.meta && (
                        <div className="mt-0.5 truncate text-[11px] text-[#726973] italic">
                          "{(a.meta as Record<string, unknown>).excerpt as string}"
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Past cycles */}
          {pastCycles.length > 0 && (
            <section className="m-card p-5">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">
                Past Cycles ({pastCycles.length})
              </h2>
              <ul className="space-y-2">
                {pastCycles.map((t) => {
                  const completion = t.completions[0];
                  return (
                    <li key={t.id} className="flex items-center gap-2.5 text-xs text-[#726973]">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: TASK_STATUS_HEX[t.status] }}
                      />
                      <span className="flex-1">
                        {completion
                          ? `Serviced ${fmtDate(completion.completedAt)} by ${completion.completedBy.name}`
                          : `Due ${fmtDate(t.dueAt)} · ${t.status}`}
                      </span>
                      <Link href={`/tasks/${t.id}`} className="font-medium text-[#440E48] hover:underline">
                        View
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function MarkDonePanel({ schedule, run }: { schedule: Schedule; run: (fn: Action) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cost, setCost] = useState("");

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1DBA87] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-105"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Mark as Serviced
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 z-30 mt-2 rounded-xl border border-[#E4DDE4] bg-white p-4 shadow-xl">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">Record Service</div>
            <label className="mb-1 block text-xs font-medium text-[#726973]">Service date</label>
            <input
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="mb-3 w-full rounded-lg border border-[#E4DDE4] px-3 py-2 text-sm outline-none focus:border-[#440E48]"
            />
            <label className="mb-1 block text-xs font-medium text-[#726973]">Actual cost (optional)</label>
            <input
              type="number"
              min={0}
              step={10}
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="—"
              className="mb-4 w-full rounded-lg border border-[#E4DDE4] px-3 py-2 text-sm outline-none focus:border-[#440E48]"
            />
            <button
              onClick={() => {
                run(() =>
                  markServiced(
                    schedule.id,
                    date ? new Date(date).toISOString() : null,
                    cost === "" ? null : Number(cost),
                  )
                );
                setOpen(false);
              }}
              className="w-full rounded-xl bg-[#1DBA87] px-4 py-2.5 text-sm font-bold text-white hover:brightness-105"
            >
              Confirm — Mark Done & Schedule Next
            </button>
            <p className="mt-2 text-center text-[10px] text-[#A19BA2]">
              Next due will be set to this date + {COMPLIANCE_INTERVAL_LABEL[schedule.interval].toLowerCase()}.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <DetailLabel>{label}</DetailLabel>
      <div className="mt-0.5 text-[#140516]">{value}</div>
    </div>
  );
}
function DetailLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-medium text-[#A19BA2]">{children}</div>;
}
