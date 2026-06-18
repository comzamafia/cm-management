"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markServiced,
  toggleComplianceActive,
  deleteComplianceSchedule,
  updateComplianceSchedule,
  type ComplianceRow,
} from "@/lib/compliance";
import {
  COMPLIANCE_CATEGORY_LABEL,
  COMPLIANCE_INTERVAL_LABEL,
  COMPLIANCE_STATUS_LABEL,
  COMPLIANCE_STATUS_HEX,
  PRIORITY_LABEL,
} from "@/lib/labels";

type UserOpt = { id: string; name: string };
type Totals = { total: number; overdue: number; dueSoon: number; upcoming: number };
type Action = () => Promise<{ ok: boolean; error?: string }>;
type ComplianceStatus = ComplianceRow["status"];

const STATUS_ORDER: ComplianceStatus[] = ["OVERDUE", "DUE_SOON", "UPCOMING"];

function money(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function dueText(days: number): string {
  if (days < 0) return `${-days}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `In ${days}d`;
}

export function ComplianceView({
  rows,
  users,
  totals,
  canEdit,
  showLocation,
}: {
  rows: ComplianceRow[];
  users: UserOpt[];
  totals: Totals;
  canEdit: boolean;
  showLocation: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const run = (fn: Action) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setErr(res.error ?? "Something went wrong");
      else setErr(null);
      router.refresh();
    });

  const active = rows.filter((r) => r.active);
  const inactive = rows.filter((r) => !r.active);

  return (
    <div className="space-y-6">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Schedules" value={totals.total} color="#440E48" />
        <Kpi label="Overdue" value={totals.overdue} color="#e2445c" />
        <Kpi label="Due Soon" value={totals.dueSoon} color="#F4A626" />
        <Kpi label="Upcoming" value={totals.upcoming} color="#1DBA87" />
      </div>

      {err && (
        <div className="rounded-lg border border-[#f3d3d8] bg-[#fdf2f3] px-4 py-2 text-sm font-medium text-[#e2445c]">{err}</div>
      )}

      {active.length === 0 && inactive.length === 0 && (
        <div className="m-card p-8 text-center text-[#726973]">
          No compliance schedules yet.{canEdit ? " Create one to start tracking recurring services." : ""}
        </div>
      )}

      {STATUS_ORDER.map((status) => {
        const group = active.filter((r) => r.status === status);
        if (group.length === 0) return null;
        return (
          <section key={status} className="m-card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-[#eee] px-4 py-3" style={{ borderLeft: `5px solid ${COMPLIANCE_STATUS_HEX[status]}` }}>
              <h2 className="text-base font-bold" style={{ color: COMPLIANCE_STATUS_HEX[status] }}>{COMPLIANCE_STATUS_LABEL[status]}</h2>
              <span className="rounded-full bg-[#f3eef3] px-2 py-0.5 text-xs font-semibold text-[#726973]">{group.length}</span>
            </div>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead className="border-b border-[#eee] bg-[#faf8fa] text-left text-xs font-semibold uppercase tracking-wider text-[#726973]">
                  <tr>
                    <th className="px-4 py-2.5">Service</th>
                    {showLocation && <th className="px-4 py-2.5 w-32">Location</th>}
                    <th className="px-4 py-2.5 w-40">Vendor</th>
                    <th className="px-4 py-2.5 w-28">Frequency</th>
                    <th className="px-4 py-2.5 w-32">Last service</th>
                    <th className="px-4 py-2.5 w-36">Next due</th>
                    <th className="px-4 py-2.5 w-40">Owner</th>
                    <th className="px-4 py-2.5 w-24">Cost</th>
                    {canEdit && <th className="px-2 py-2.5 w-40" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3eef3]">
                  {group.map((r) => (
                    <Row key={r.id} r={r} users={users} canEdit={canEdit} run={run} showLocation={showLocation} />
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="divide-y divide-[#f3eef3] sm:hidden">
              {group.map((r) => (
                <Card key={r.id} r={r} users={users} canEdit={canEdit} run={run} showLocation={showLocation} />
              ))}
            </div>
          </section>
        );
      })}

      {inactive.length > 0 && (
        <section className="m-card overflow-hidden opacity-70">
          <div className="border-b border-[#eee] px-4 py-3 text-sm font-bold text-[#726973]">Paused ({inactive.length})</div>
          <div className="divide-y divide-[#f3eef3]">
            {inactive.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-sm font-medium text-[#140516]">
                  [{COMPLIANCE_CATEGORY_LABEL[r.category]}] {r.name}
                </span>
                {canEdit && (
                  <button onClick={() => run(() => toggleComplianceActive(r.id))} className="text-xs font-semibold text-[#440E48] hover:underline">
                    Resume
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({
  r, users, canEdit, run, showLocation,
}: {
  r: ComplianceRow; users: UserOpt[]; canEdit: boolean; run: (fn: Action) => void; showLocation: boolean;
}) {
  return (
    <tr className="hover:bg-[#faf8fa]">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="h-7 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: COMPLIANCE_STATUS_HEX[r.status] }} />
          <div>
            <Link href={`/compliance/${r.id}`} className="font-semibold text-[#140516] hover:text-[#440E48] hover:underline">
              {r.name}
            </Link>
            <div className="text-xs text-[#A19BA2]">{COMPLIANCE_CATEGORY_LABEL[r.category]} · {PRIORITY_LABEL[r.priority]}</div>
          </div>
        </div>
      </td>
      {showLocation && <td className="px-4 py-2.5 text-[#726973]">{r.locationName}</td>}
      <td className="px-4 py-2.5">
        {r.vendor ? (
          <div>
            <div className="text-[#140516]">{r.vendor}</div>
            {r.vendorContact && <div className="text-xs text-[#A19BA2]">{r.vendorContact}</div>}
          </div>
        ) : <span className="text-[#A19BA2]">—</span>}
      </td>
      <td className="px-4 py-2.5 text-[#726973]">{COMPLIANCE_INTERVAL_LABEL[r.interval]}</td>
      <td className="px-4 py-2.5 text-[#726973]">{fmtDate(r.lastServiceDate)}</td>
      <td className="px-4 py-2.5">
        <div className="font-medium text-[#140516]">{fmtDate(r.nextDueDate)}</div>
        <div className="text-xs font-semibold" style={{ color: COMPLIANCE_STATUS_HEX[r.status] }}>{dueText(r.daysUntil)}</div>
      </td>
      <td className="px-4 py-2.5">
        {canEdit ? (
          <select
            value={r.assigneeId ?? ""}
            onChange={(e) => run(() => updateComplianceSchedule(r.id, { assigneeId: e.target.value || null }))}
            className="w-full rounded-md border border-[#E4DDE4] bg-white px-2 py-1.5 text-sm text-[#140516] outline-none hover:border-[#A19BA2] focus:border-[#440E48]"
          >
            <option value="">— Unassigned —</option>
            {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
          </select>
        ) : (
          <span className="text-[#726973]">{r.assigneeName ?? "—"}</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-[#726973]">{money(r.estimatedCost)}</td>
      {canEdit && (
        <td className="px-2 py-2.5">
          <RowActions r={r} run={run} />
        </td>
      )}
    </tr>
  );
}

function RowActions({ r, run }: { r: ComplianceRow; run: (fn: Action) => void }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <MarkServicedButton r={r} run={run} />
      <button
        onClick={() => run(() => toggleComplianceActive(r.id))}
        title="Pause"
        className="rounded-md p-1.5 text-[#A19BA2] hover:bg-[#f3eef3] hover:text-[#726973]"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
      </button>
      <button
        onClick={() => { if (confirm(`Delete "${r.name}"? Its history tasks are kept but unlinked.`)) run(() => deleteComplianceSchedule(r.id)); }}
        title="Delete"
        className="rounded-md p-1.5 text-[#A19BA2] hover:bg-[#fdf2f3] hover:text-[#e2445c]"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>
  );
}

function MarkServicedButton({ r, run }: { r: ComplianceRow; run: (fn: Action) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cost, setCost] = useState("");
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-md bg-[#1DBA87] px-2.5 py-1.5 text-xs font-semibold text-white hover:brightness-105"
      >
        Mark done
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-60 rounded-lg border border-[#E4DDE4] bg-white p-3 text-left shadow-lg">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">Record service</div>
            <label className="mb-1 block text-xs text-[#726973]">Service date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="mb-2 w-full rounded-md border border-[#E4DDE4] px-2 py-1 text-sm outline-none focus:border-[#440E48]" />
            <label className="mb-1 block text-xs text-[#726973]">Actual cost (optional)</label>
            <input type="number" min={0} step={10} value={cost} onChange={(e) => setCost(e.target.value)} placeholder="—"
              className="mb-3 w-full rounded-md border border-[#E4DDE4] px-2 py-1 text-sm outline-none focus:border-[#440E48]" />
            <button
              onClick={() => {
                run(() => markServiced(r.id, date ? new Date(date).toISOString() : null, cost === "" ? null : Number(cost)));
                setOpen(false);
              }}
              className="w-full rounded-md bg-[#1DBA87] px-2 py-1.5 text-xs font-semibold text-white"
            >
              Mark done & schedule next
            </button>
            <p className="mt-2 text-[10px] text-[#A19BA2]">Next due will be set from this date + {COMPLIANCE_INTERVAL_LABEL[r.interval].toLowerCase()}.</p>
          </div>
        </>
      )}
    </div>
  );
}

function Card({
  r, users, canEdit, run, showLocation,
}: {
  r: ComplianceRow; users: UserOpt[]; canEdit: boolean; run: (fn: Action) => void; showLocation: boolean;
}) {
  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 h-5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: COMPLIANCE_STATUS_HEX[r.status] }} />
        <div className="flex-1">
          <Link href={`/compliance/${r.id}`} className="block text-sm font-semibold text-[#140516] hover:text-[#440E48]">
            {r.name}
          </Link>
          <div className="text-xs text-[#A19BA2]">
            {COMPLIANCE_CATEGORY_LABEL[r.category]} · {COMPLIANCE_INTERVAL_LABEL[r.interval]}
            {showLocation ? ` · ${r.locationName}` : ""}
          </div>
        </div>
        <span className="shrink-0 text-xs font-semibold" style={{ color: COMPLIANCE_STATUS_HEX[r.status] }}>{dueText(r.daysUntil)}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[#726973]">
        <div><span className="text-[#A19BA2]">Next due:</span> {fmtDate(r.nextDueDate)}</div>
        <div><span className="text-[#A19BA2]">Vendor:</span> {r.vendor ?? "—"}</div>
        <div><span className="text-[#A19BA2]">Owner:</span> {r.assigneeName ?? "—"}</div>
        <div><span className="text-[#A19BA2]">Cost:</span> {money(r.estimatedCost)}</div>
      </div>
      {canEdit && (
        <div className="flex items-center gap-2 pt-1">
          <MarkServicedButton r={r} run={run} />
          <button onClick={() => run(() => toggleComplianceActive(r.id))} className="text-xs font-semibold text-[#726973]">Pause</button>
          <button onClick={() => { if (confirm(`Delete "${r.name}"?`)) run(() => deleteComplianceSchedule(r.id)); }} className="text-xs font-semibold text-[#e2445c]">Delete</button>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="m-card relative overflow-hidden p-4">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
      <div className="text-3xl font-extrabold" style={{ color }}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-[#726973]">{label}</div>
    </div>
  );
}
