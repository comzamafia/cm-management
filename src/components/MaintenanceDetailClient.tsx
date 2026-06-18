"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MaintenanceStatus } from "@prisma/client";
import {
  assignMaintenance,
  transitionMaintenanceStatus,
  addMaintenanceComment,
  deleteMaintenanceComment,
} from "@/lib/maintenance";
import {
  MAINTENANCE_STATUS_LABEL,
  MAINTENANCE_NEXT,
  PRIORITY_LABEL,
  PRIORITY_STYLE,
  formatDateTime,
  MAINTENANCE_AREA_LABEL,
} from "@/lib/labels";
import { PhotoUploader } from "./PhotoUploader";

// ── types ─────────────────────────────────────────────────────────────────────
type Assignable = { id: string; name: string };
type Comment = { id: string; body: string; createdAt: Date; user: { id: string; name: string } };
type ActivityEntry = { id: string; action: string; meta: unknown; timestamp: Date; user: { id: string; name: string } };

type Req = {
  id: string;
  title: string;
  description: string | null;
  area: import("@prisma/client").MaintenanceArea;
  priority: import("@prisma/client").Priority;
  status: MaintenanceStatus;
  locationId: string;
  vendor: string | null;
  resolutionNote: string | null;
  cost: number | null;
  photoUrls: unknown;
  createdAt: Date;
  resolvedAt: Date | null;
  assignedToId: string | null;
  location: { id: string; name: string };
  reportedBy: { id: string; name: string };
  assignedTo: { id: string; name: string } | null;
  resolvedBy: { id: string; name: string } | null;
  comments: Comment[];
};

// ── status flow ───────────────────────────────────────────────────────────────
const STATUS_ORDER: MaintenanceStatus[] = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const STATUS_COLOR: Record<MaintenanceStatus, string> = {
  OPEN: "#e2445c",
  ACKNOWLEDGED: "#5B8DD9",
  IN_PROGRESS: "#F4A626",
  RESOLVED: "#1DBA87",
  CLOSED: "#440E48",
};

const STATUS_BG: Record<MaintenanceStatus, string> = {
  OPEN: "bg-[#fdf2f3]",
  ACKNOWLEDGED: "bg-[#EFF4FD]",
  IN_PROGRESS: "bg-[#FFF7E6]",
  RESOLVED: "bg-[#E8FBF5]",
  CLOSED: "bg-[#F5EEF5]",
};

const ACTION_LABEL: Record<MaintenanceStatus, string> = {
  OPEN: "Mark Open",
  ACKNOWLEDGED: "Acknowledge",
  IN_PROGRESS: "Start Work",
  RESOLVED: "Resolve",
  CLOSED: "Close",
};

function activityIcon(action: string): React.ReactNode {
  if (action.includes("status_changed")) return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
  );
  if (action.includes("assigned")) return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  );
  if (action.includes("commented")) return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  );
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  );
}

function activityDesc(action: string, meta: unknown): string {
  const m = (meta ?? {}) as Record<string, unknown>;
  if (action === "maintenance.status_changed") {
    const from = MAINTENANCE_STATUS_LABEL[m.from as MaintenanceStatus] ?? m.from;
    const to = MAINTENANCE_STATUS_LABEL[m.to as MaintenanceStatus] ?? m.to;
    return `${from} → ${to}`;
  }
  if (action === "maintenance.reported") return "Reported issue";
  if (action === "maintenance.assigned") return "Updated assignment";
  if (action === "maintenance.commented") return m.excerpt ? `"${m.excerpt}"` : "Added a comment";
  return action.replace("maintenance.", "").replace(/_/g, " ");
}

// ── main component ────────────────────────────────────────────────────────────
export function MaintenanceDetailClient({
  req,
  activity,
  assignables,
  canManage,
  canAct,
  canComment,
  currentUserId,
}: {
  req: Req;
  activity: ActivityEntry[];
  assignables: Assignable[];
  canManage: boolean;
  canAct: boolean;
  canComment: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  // comment state
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  // resolve form
  const [showResolve, setShowResolve] = useState(false);
  const [note, setNote] = useState("");
  const [cost, setCost] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [resolving, setResolving] = useState(false);

  // assign form
  const [assignee, setAssignee] = useState(req.assignedToId ?? "");
  const [vendorName, setVendorName] = useState(req.vendor ?? "");

  const storedPhotos = (req.photoUrls as string[]) ?? [];
  const currentIdx = STATUS_ORDER.indexOf(req.status);
  const nexts = MAINTENANCE_NEXT[req.status].filter((s) => s !== "RESOLVED");
  const canResolve = MAINTENANCE_NEXT[req.status].includes("RESOLVED");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setErr(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setErr(res.error ?? "Failed");
      router.refresh();
    });
  }

  async function submitComment() {
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    setErr(null);
    const res = await addMaintenanceComment(req.id, body);
    setPosting(false);
    if (!res.ok) { setErr(res.error ?? "Failed"); return; }
    setDraft("");
    router.refresh();
  }

  async function submitResolve() {
    setResolving(true);
    setErr(null);
    const res = await transitionMaintenanceStatus({ id: req.id, to: "RESOLVED", resolutionNote: note, cost: cost ? Number(cost) : null, photoUrls: photos });
    setResolving(false);
    if (!res.ok) { setErr(res.error ?? "Failed"); return; }
    setShowResolve(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {err && (
        <div className="rounded-xl border border-[#f3d3d8] bg-[#fdf2f3] px-4 py-2.5 text-sm font-medium text-[#e2445c]">
          {err}
        </div>
      )}

      {/* ── Header ── */}
      <div className="m-card overflow-hidden">
        <div className="h-1.5" style={{ backgroundColor: STATUS_COLOR[req.status] }} />
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                  style={{ backgroundColor: STATUS_COLOR[req.status] }}
                >
                  {MAINTENANCE_STATUS_LABEL[req.status]}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${PRIORITY_STYLE[req.priority]}`}>
                  {PRIORITY_LABEL[req.priority]}
                </span>
                <span className="text-xs text-[#A19BA2]">{MAINTENANCE_AREA_LABEL[req.area]} · {req.location.name}</span>
              </div>
              <h1 className="mt-2 text-[22px] font-bold leading-snug text-[#140516]">{req.title}</h1>
              <p className="mt-0.5 text-xs text-[#A19BA2]">
                Reported by {req.reportedBy.name} · {formatDateTime(req.createdAt)}
              </p>
            </div>
          </div>

          {/* Status stepper */}
          <div className="mt-5">
            <div className="flex items-center">
              {STATUS_ORDER.map((s, i) => {
                const done = i < currentIdx;
                const current = i === currentIdx;
                const future = i > currentIdx;
                const color = STATUS_COLOR[s];
                return (
                  <div key={s} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all ${
                          current
                            ? "border-transparent text-white shadow-md"
                            : done
                            ? "border-transparent text-white"
                            : "border-[#E4DDE4] bg-white text-[#A19BA2]"
                        }`}
                        style={done || current ? { backgroundColor: color, borderColor: color } : {}}
                      >
                        {done ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        ) : (
                          <span>{i + 1}</span>
                        )}
                      </div>
                      <span
                        className="text-[9px] font-semibold uppercase tracking-wide"
                        style={{ color: current ? color : done ? color : "#A19BA2" }}
                      >
                        {MAINTENANCE_STATUS_LABEL[s]}
                      </span>
                    </div>
                    {i < STATUS_ORDER.length - 1 && (
                      <div
                        className="mx-1 mb-4 h-0.5 flex-1 rounded-full transition-all"
                        style={{ backgroundColor: i < currentIdx ? STATUS_COLOR[STATUS_ORDER[i + 1]] : "#E4DDE4" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column: Actions + Details ── */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Actions panel */}
        <div className="space-y-3 lg:col-span-2">
          {/* Next-step buttons */}
          {canAct && req.status !== "CLOSED" && (
            <div className={`m-card p-4 ${STATUS_BG[req.status]}`}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">Actions</h2>
              <div className="space-y-2">
                {nexts.map((to) => (
                  <button
                    key={to}
                    onClick={() => run(() => transitionMaintenanceStatus({ id: req.id, to }))}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
                    style={{ backgroundColor: STATUS_COLOR[to] }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                    {ACTION_LABEL[to]}
                  </button>
                ))}

                {canResolve && !showResolve && (
                  <button
                    onClick={() => setShowResolve(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1DBA87] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-105"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Mark Resolved
                  </button>
                )}

                {req.status === "RESOLVED" && canManage && (
                  <button
                    onClick={() => run(() => transitionMaintenanceStatus({ id: req.id, to: "CLOSED" }))}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#440E48] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#5A1560]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Close Request
                  </button>
                )}
              </div>

              {/* Resolve form */}
              {showResolve && (
                <div className="mt-3 space-y-3 rounded-xl border border-[#E4DDE4] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#726973]">Resolution Details</span>
                    <button onClick={() => setShowResolve(false)} className="text-xs text-[#A19BA2] hover:text-[#726973]">Cancel</button>
                  </div>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What was done to fix it? (required)"
                    className="w-full resize-none rounded-lg border border-[#E4DDE4] px-3 py-2 text-sm outline-none focus:border-[#1DBA87] focus:ring-2 focus:ring-[#1DBA87]/10"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#726973]">Cost ($)</span>
                    <input
                      type="number"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="0"
                      min={0}
                      className="w-28 rounded-lg border border-[#E4DDE4] px-2.5 py-1.5 text-sm outline-none focus:border-[#440E48]"
                    />
                  </div>
                  <PhotoUploader value={photos} onChange={setPhotos} disabled={resolving} />
                  <button
                    onClick={submitResolve}
                    disabled={resolving || !note.trim()}
                    className="w-full rounded-xl bg-[#1DBA87] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-50"
                  >
                    {resolving ? "Saving…" : "Confirm Resolved"}
                  </button>
                </div>
              )}

              {/* Assign (managers only) */}
              {canManage && (
                <div className="mt-3 space-y-2 border-t border-[#E4DDE4]/60 pt-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#726973]">Assign</span>
                  <select
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="w-full rounded-lg border border-[#E4DDE4] bg-white px-2.5 py-2 text-sm outline-none focus:border-[#440E48]"
                  >
                    <option value="">— Internal staff —</option>
                    {assignables.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <input
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="External vendor (optional)"
                    className="w-full rounded-lg border border-[#E4DDE4] bg-white px-2.5 py-2 text-sm outline-none focus:border-[#440E48]"
                  />
                  <button
                    onClick={() => run(() => assignMaintenance({ id: req.id, assignedToId: assignee || null, vendor: vendorName || null }))}
                    className="w-full rounded-xl bg-[#F0EBF0] px-4 py-2 text-sm font-semibold text-[#440E48] transition hover:bg-[#E4DDE4]"
                  >
                    Save Assignment
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Resolution summary (when resolved/closed) */}
          {(req.status === "RESOLVED" || req.status === "CLOSED") && (
            <div className="m-card p-4">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#1DBA87]">Resolution</h2>
              {req.resolutionNote && (
                <p className="mb-2 text-sm text-[#433745]">{req.resolutionNote}</p>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs text-[#726973]">
                {req.resolvedBy && <div><span className="text-[#A19BA2]">By:</span> {req.resolvedBy.name}</div>}
                {req.resolvedAt && <div><span className="text-[#A19BA2]">At:</span> {formatDateTime(req.resolvedAt)}</div>}
                {req.cost != null && <div><span className="text-[#A19BA2]">Cost:</span> ${req.cost.toFixed(2)}</div>}
              </div>
            </div>
          )}
        </div>

        {/* Details card */}
        <div className="m-card p-5 lg:col-span-3">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">Details</h2>
          {req.description && (
            <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-[#433745]">{req.description}</p>
          )}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <DetailField label="Assigned to" value={req.assignedTo?.name ?? "Unassigned"} />
            <DetailField label="Vendor" value={req.vendor ?? "—"} />
            <DetailField label="Location" value={req.location.name} />
            <DetailField label="Reported by" value={req.reportedBy.name} />
          </dl>
          {storedPhotos.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#A19BA2]">Photos</p>
              <div className="flex flex-wrap gap-2">
                {storedPhotos.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="maintenance photo" className="h-20 w-20 rounded-lg object-cover ring-1 ring-[#E4DDE4] hover:ring-[#440E48]" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Comments + Activity ── */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Comments */}
        <section className="m-card p-5 lg:col-span-3">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#726973]">
            Comments ({req.comments.length})
          </h2>

          {canComment && (
            <div className="mb-5">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submitComment(); }}
                rows={2}
                placeholder="Add an update… (e.g. Contacted vendor, awaiting parts)"
                className="w-full resize-none rounded-xl border border-[#E4DDE4] px-3 py-2 text-sm placeholder-[#A19BA2] outline-none focus:border-[#440E48] focus:ring-2 focus:ring-[#440E48]/10"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-[#A19BA2]">⌘/Ctrl + Enter to post</span>
                <button
                  onClick={submitComment}
                  disabled={posting || !draft.trim()}
                  className="m-btn px-4 py-1.5 text-sm disabled:opacity-50"
                >
                  {posting ? "Posting…" : "Post"}
                </button>
              </div>
            </div>
          )}

          {req.comments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E4DDE4] py-8 text-center text-sm text-[#A19BA2]">
              No comments yet.{canComment ? " Add one above to track progress." : ""}
            </div>
          ) : (
            <ul className="space-y-4">
              {req.comments.map((c) => (
                <li key={c.id} className="group flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#440E48] text-xs font-bold text-white">
                    {c.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 rounded-xl border border-[#E4DDE4] bg-[#FAF6FA] px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#140516]">{c.user.name}</span>
                      <span className="text-[11px] text-[#A19BA2]">{formatDateTime(c.createdAt)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-[#433745]">{c.body}</p>
                  </div>
                  {(c.user.id === currentUserId || canManage) && (
                    <button
                      onClick={() => run(() => deleteMaintenanceComment(c.id))}
                      aria-label="Delete"
                      className="mt-2 shrink-0 text-[#C9C4C9] opacity-0 transition hover:text-[#e2445c] group-hover:opacity-100"
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

        {/* Activity timeline */}
        <section className="m-card p-5 lg:col-span-2">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#726973]">Activity</h2>
          {activity.length === 0 ? (
            <div className="text-sm text-[#A19BA2]">No activity yet.</div>
          ) : (
            <ol className="relative ml-3 space-y-4 border-l-2 border-[#E4DDE4]">
              {activity.map((a, i) => {
                const isStatus = a.action === "maintenance.status_changed";
                const m = (a.meta ?? {}) as Record<string, unknown>;
                const toStatus = isStatus ? (m.to as MaintenanceStatus) : null;
                const dotColor = toStatus ? STATUS_COLOR[toStatus] : "#440E48";
                return (
                  <li key={a.id} className="-ml-[13px] flex items-start gap-3">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white text-white"
                      style={{ backgroundColor: dotColor }}
                    >
                      {activityIcon(a.action)}
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex flex-wrap items-baseline gap-1">
                        <span className="text-xs font-semibold text-[#140516]">{a.user.name}</span>
                        <span className="text-xs text-[#726973]">{activityDesc(a.action, a.meta)}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#A19BA2]">{formatDateTime(a.timestamp)}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-[#A19BA2]">{label}</dt>
      <dd className="mt-0.5 font-medium text-[#140516]">{value}</dd>
    </div>
  );
}
