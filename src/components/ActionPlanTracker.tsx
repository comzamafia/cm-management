"use client";

import { useMemo, useState, useTransition } from "react";
import { setActionPlanEntry } from "@/lib/action-plan";
import {
  WEEKLY_TASKS, MONTHLY_TASKS, VENDORS, RESTAURANTS, DAYS,
  keys, nextDue, deadline, weekdayOf, weeklyStats, monthlyStats,
  overall, locationStats, vendorsPaid, type Entries,
} from "@/lib/action-plan-data";

type Tab = "dashboard" | "weekly" | "monthly" | "vendors" | "summary";

const TABS: [Tab, string][] = [
  ["dashboard", "Dashboard"],
  ["weekly", "Weekly"],
  ["monthly", "Monthly"],
  ["vendors", "Vendors"],
  ["summary", "Summary"],
];

const SUMMARY_FIELDS: [string, string][] = [
  ["issues", "Key Issues Identified"],
  ["actions", "Actions Taken"],
  ["outstanding", "Outstanding Items"],
  ["escalations", "Escalations Required"],
  ["priorities", "Priorities for Next Week"],
];

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { month: "short", day: "2-digit", year: "numeric" });
}
function pctBadge(pct: number): string {
  if (pct >= 90) return "bg-[#DCFCE7] text-[#15803D]";
  if (pct < 60) return "bg-[#FEE2E2] text-[#DC2626]";
  return "bg-[#F0EBF0] text-[#5b475d]";
}

export function ActionPlanTracker({
  week, month, todayISO, entries: initial,
}: {
  week: string;
  month: string;
  todayISO: string;
  entries: Entries;
}) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [entries, setEntries] = useState<Entries>(initial);
  const [, startTransition] = useTransition();

  const today = useMemo(() => {
    const [y, m, d] = todayISO.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [todayISO]);

  // Optimistic write: update local state immediately, persist in the background.
  function setEntry(period: string, key: string, value: string) {
    setEntries((prev) => {
      const next = { ...prev };
      if (value === "") delete next[key];
      else next[key] = value;
      return next;
    });
    startTransition(() => { void setActionPlanEntry(period, key, value); });
  }

  const isOn = (key: string) => entries[key] === "1";
  const toggleWeekly = (taskId: string, day: number) => {
    const k = keys.weekly(taskId, day);
    setEntry(week, k, isOn(k) ? "" : "1");
  };
  const toggleMonthlyAll = (taskId: string) => {
    const k = keys.monthlyAll(taskId);
    setEntry(month, k, isOn(k) ? "" : "1");
  };
  const toggleMonthlyGrid = (taskId: string, loc: string) => {
    const k = keys.monthlyGrid(taskId, loc);
    setEntry(month, k, isOn(k) ? "" : "1");
  };
  const toggleVendorReviewed = (v: string) => {
    const k = keys.vendor(v, "reviewed");
    setEntry(month, k, isOn(k) ? "" : "1");
  };

  const o = useMemo(() => overall(entries, today), [entries, today]);
  const wd = weekdayOf(today);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="m-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#F4A626]">Operations Tracker</div>
          <h1 className="mt-1 text-[24px] font-bold tracking-tight text-[#140516]">Area Manager Action Plan</h1>
          <p className="mt-0.5 text-sm text-[#726973]">
            Today: {fmtDate(today)} · Week {week} · Month {month}
          </p>
        </div>
        <div className="min-w-[220px]">
          <div className="flex items-end justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#726973]">Overall completion</span>
            <span className="text-2xl font-extrabold text-[#440E48]">{o.pct}%</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#EFEAF0]">
            <span className="block h-full rounded-full bg-gradient-to-r from-[#440E48] to-[#F4A626]" style={{ width: `${o.pct}%` }} />
          </div>
          <div className="mt-1.5 text-xs font-semibold text-[#e2445c]">{o.overdue} overdue task{o.overdue === 1 ? "" : "s"}</div>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Completed" value={o.done} color="#1DBA87" />
        <Kpi label="Total Items" value={o.total} color="#440E48" />
        <Kpi label="Overdue" value={o.overdue} color="#e2445c" />
        <Kpi label="Vendor Payments" value={`${vendorsPaid(entries)}/${VENDORS.length}`} color="#F4A626" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === id
                ? "bg-[#440E48] text-white shadow-sm"
                : "bg-white text-[#726973] ring-1 ring-inset ring-[#E4DDE4] hover:bg-[#FAF6FA]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <DashboardTab entries={entries} today={today} o={o} />}
      {tab === "weekly" && (
        <WeeklyTab entries={entries} today={today} wd={wd} toggle={toggleWeekly} />
      )}
      {tab === "monthly" && (
        <MonthlyTab entries={entries} today={today} toggleAll={toggleMonthlyAll} toggleGrid={toggleMonthlyGrid} />
      )}
      {tab === "vendors" && (
        <VendorsTab entries={entries} today={today} month={month}
          toggleReviewed={toggleVendorReviewed} setEntry={setEntry} />
      )}
      {tab === "summary" && <SummaryTab entries={entries} week={week} setEntry={setEntry} />}
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="m-card relative overflow-hidden p-4">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
      <div className="text-3xl font-extrabold" style={{ color }}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-[#726973]">{label}</div>
    </div>
  );
}

// ── Check cell ────────────────────────────────────────────────────────────
function Check({ state, onClick }: { state: "done" | "overdue" | "open" | "na"; onClick?: () => void }) {
  const cls =
    state === "done" ? "bg-[#DCFCE7] border-[#bbf7d0] text-[#15803D]"
    : state === "overdue" ? "bg-[#FEE2E2] border-[#fecaca] text-[#DC2626]"
    : state === "na" ? "bg-[#F1F5F9] border-[#E4DDE4] text-[#cbd5e1] cursor-default"
    : "bg-white border-[#E4DDE4] text-[#A19BA2]";
  return (
    <span
      onClick={state === "na" ? undefined : onClick}
      className={`inline-flex h-8 min-w-9 items-center justify-center rounded-lg border text-sm font-extrabold select-none ${cls} ${state === "na" ? "" : "cursor-pointer"}`}
    >
      {state === "done" ? "✓" : state === "na" ? "—" : "□"}
    </span>
  );
}

const TH = "border-b border-[#E4DDE4] bg-[#FAF7FB] px-3 py-2.5 text-left text-[11px] font-extrabold uppercase tracking-wide text-[#5b475d]";
const TD = "border-b border-[#EEEAEE] px-3 py-2.5 align-middle";

// ── Dashboard ───────────────────────────────────────────────────────────────
function DashboardTab({ entries, today, o }: { entries: Entries; today: Date; o: ReturnType<typeof overall> }) {
  const locs = locationStats(entries, today);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="m-card overflow-hidden">
        <div className="px-5 pt-4">
          <h3 className="text-base font-bold text-[#140516]">KPI by Category</h3>
          <p className="mb-3 text-xs text-[#726973]">Completion by workstream.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th className={TH}>Category</th><th className={`${TH} text-center`}>Total</th><th className={`${TH} text-center`}>Done</th><th className={`${TH} text-center`}>%</th></tr></thead>
            <tbody>
              {Object.entries(o.categories).map(([cat, v]) => {
                const pct = v.due ? Math.round((v.done / v.due) * 100) : 0;
                return (
                  <tr key={cat}>
                    <td className={`${TD} font-semibold text-[#140516]`}>{cat}</td>
                    <td className={`${TD} text-center`}>{v.due}</td>
                    <td className={`${TD} text-center`}>{v.done}</td>
                    <td className={`${TD} text-center`}><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${pctBadge(pct)}`}>{pct}%</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="m-card overflow-hidden">
        <div className="px-5 pt-4">
          <h3 className="text-base font-bold text-[#140516]">Location Completion</h3>
          <p className="mb-3 text-xs text-[#726973]">Per-location tasks only.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th className={TH}>Location</th><th className={`${TH} text-center`}>Completion</th></tr></thead>
            <tbody>
              {locs.map((l) => (
                <tr key={l.loc}>
                  <td className={`${TD} font-semibold text-[#140516]`}>{l.loc}</td>
                  <td className={`${TD} text-center`}><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${pctBadge(l.pct)}`}>{l.pct}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ── Weekly ────────────────────────────────────────────────────────────────
function WeeklyTab({
  entries, today, wd, toggle,
}: { entries: Entries; today: Date; wd: number; toggle: (id: string, day: number) => void }) {
  return (
    <section className="m-card overflow-hidden">
      <div className="px-5 pt-4">
        <h3 className="text-base font-bold text-[#140516]">Weekly Tasks</h3>
        <p className="mb-3 text-xs text-[#726973]">Click a day box when completed. Resets automatically each week; history is kept.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr>
              <th className={TH}>Task</th><th className={TH}>Category</th><th className={TH}>Location</th>
              {DAYS.map((d) => <th key={d} className={`${TH} text-center`}>{d}</th>)}
              <th className={`${TH} text-center`}>Done</th><th className={`${TH} text-center`}>Week %</th>
            </tr>
          </thead>
          <tbody>
            {WEEKLY_TASKS.map((t) => {
              const s = weeklyStats(t, entries, today);
              const pct = Math.round((s.done / s.due) * 100);
              return (
                <tr key={t.id}>
                  <td className={`${TD} min-w-[240px] font-semibold text-[#140516]`}>{t.task}</td>
                  <td className={TD}><span className="inline-flex rounded-full bg-[#F0EBF0] px-2 py-0.5 text-xs font-semibold text-[#5b475d]">{t.category}</span></td>
                  <td className={`${TD} text-[#726973]`}>{t.location}</td>
                  {[1, 2, 3, 4, 5].map((d) => {
                    if (!t.days.includes(d)) return <td key={d} className={`${TD} text-center`}><Check state="na" /></td>;
                    const done = entries[keys.weekly(t.id, d)] === "1";
                    const state = done ? "done" : (d <= wd && wd <= 5 ? "overdue" : "open");
                    return <td key={d} className={`${TD} text-center`}><Check state={state} onClick={() => toggle(t.id, d)} /></td>;
                  })}
                  <td className={`${TD} text-center`}>{s.done}/{s.due}</td>
                  <td className={`${TD} text-center`}><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${pctBadge(pct)}`}>{pct}%</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Monthly ───────────────────────────────────────────────────────────────
function MonthlyTab({
  entries, today, toggleAll, toggleGrid,
}: {
  entries: Entries; today: Date;
  toggleAll: (id: string) => void;
  toggleGrid: (id: string, loc: string) => void;
}) {
  return (
    <section className="m-card overflow-hidden">
      <div className="px-5 pt-4">
        <h3 className="text-base font-bold text-[#140516]">Monthly Action Items</h3>
        <p className="mb-3 text-xs text-[#726973]">Restaurant-specific items track by location. All-location items use one combined checkbox.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr>
              <th className={TH}>Task</th><th className={`${TH} text-center`}>Due</th><th className={`${TH} text-center`}>Deadline</th>
              {RESTAURANTS.map((r) => <th key={r} className={`${TH} text-center`}>{r}</th>)}
              <th className={`${TH} text-center`}>Done</th><th className={`${TH} text-center`}>Month %</th>
            </tr>
          </thead>
          <tbody>
            {MONTHLY_TASKS.map((t) => {
              const s = monthlyStats(t, entries, today);
              const pct = Math.round((s.done / s.due) * 100);
              const past = today >= deadline(t, today);
              return (
                <tr key={t.id}>
                  <td className={`${TD} min-w-[240px] font-semibold text-[#140516]`}>{t.task}</td>
                  <td className={`${TD} text-center text-[#726973]`}>{fmtDate(nextDue(t.dueDay, today))}</td>
                  <td className={`${TD} text-center text-[#726973]`}>{fmtDate(deadline(t, today))}</td>
                  {t.mode === "all" ? (
                    <td className={`${TD} text-center`} colSpan={RESTAURANTS.length}>
                      <Check state={entries[keys.monthlyAll(t.id)] === "1" ? "done" : past ? "overdue" : "open"} onClick={() => toggleAll(t.id)} />
                    </td>
                  ) : (
                    RESTAURANTS.map((loc) => {
                      if (!(t.applicable ?? []).includes(loc)) return <td key={loc} className={`${TD} text-center`}><Check state="na" /></td>;
                      const done = entries[keys.monthlyGrid(t.id, loc)] === "1";
                      return <td key={loc} className={`${TD} text-center`}><Check state={done ? "done" : past ? "overdue" : "open"} onClick={() => toggleGrid(t.id, loc)} /></td>;
                    })
                  )}
                  <td className={`${TD} text-center`}>{s.done}/{s.due}</td>
                  <td className={`${TD} text-center`}><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${pctBadge(pct)}`}>{pct}%</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Vendors ───────────────────────────────────────────────────────────────
function VendorsTab({
  entries, today, month, toggleReviewed, setEntry,
}: {
  entries: Entries; today: Date; month: string;
  toggleReviewed: (v: string) => void;
  setEntry: (period: string, key: string, value: string) => void;
}) {
  const due8 = nextDue(8, today);
  const inp = "w-full rounded-lg border border-[#E4DDE4] px-2.5 py-2 text-sm outline-none focus:border-[#440E48]";
  return (
    <section className="m-card overflow-hidden">
      <div className="px-5 pt-4">
        <h3 className="text-base font-bold text-[#140516]">Vendor Review Checklist</h3>
        <p className="mb-3 text-xs text-[#726973]">Review status, payment dates, and notes. Target payment date is the 8th of each month.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr><th className={TH}>Vendor</th><th className={`${TH} text-center`}>Reviewed</th><th className={TH}>Payment Date</th><th className={TH}>Notes</th></tr>
          </thead>
          <tbody>
            {VENDORS.map((v) => {
              const reviewed = entries[keys.vendor(v, "reviewed")] === "1";
              const payDate = entries[keys.vendor(v, "payDate")] ?? "";
              const note = entries[keys.vendor(v, "note")] ?? "";
              const overdue = !payDate && today >= due8;
              return (
                <tr key={v}>
                  <td className={`${TD} font-semibold text-[#140516]`}>{v}</td>
                  <td className={`${TD} text-center`}><Check state={reviewed ? "done" : "open"} onClick={() => toggleReviewed(v)} /></td>
                  <td className={TD}>
                    <input type="date" defaultValue={payDate}
                      className={`${inp} ${overdue ? "border-[#fecaca] bg-[#FEE2E2]" : payDate ? "bg-[#DCFCE7]" : ""}`}
                      onChange={(e) => setEntry(month, keys.vendor(v, "payDate"), e.target.value)} />
                  </td>
                  <td className={TD}>
                    <input type="text" placeholder="Notes" defaultValue={note} className={inp}
                      onBlur={(e) => setEntry(month, keys.vendor(v, "note"), e.target.value)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Summary ─────────────────────────────────────────────────────────────────
function SummaryTab({
  entries, week, setEntry,
}: { entries: Entries; week: string; setEntry: (period: string, key: string, value: string) => void }) {
  const inp = "w-full rounded-lg border border-[#E4DDE4] px-3 py-2 text-sm outline-none focus:border-[#440E48]";
  return (
    <section className="m-card p-5">
      <h3 className="text-base font-bold text-[#140516]">Weekly Performance Summary</h3>
      <p className="mb-4 text-xs text-[#726973]">Document what happened, what was fixed, what remains open, and follow-ups for next week.</p>
      <div className="grid gap-4">
        {SUMMARY_FIELDS.map(([key, label]) => (
          <div key={key}>
            <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-[#726973]">{label}</label>
            <textarea defaultValue={entries[keys.summary(key)] ?? ""} rows={4}
              className={`${inp} min-h-[96px] resize-y leading-relaxed`}
              onBlur={(e) => setEntry(week, keys.summary(key), e.target.value)} />
          </div>
        ))}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-[#726973]">Reviewed By</label>
            <input type="text" defaultValue={entries[keys.summary("manager")] ?? ""} className={inp}
              onBlur={(e) => setEntry(week, keys.summary("manager"), e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-[#726973]">Date</label>
            <input type="date" defaultValue={entries[keys.summary("date")] ?? ""} className={inp}
              onChange={(e) => setEntry(week, keys.summary("date"), e.target.value)} />
          </div>
        </div>
      </div>
    </section>
  );
}
