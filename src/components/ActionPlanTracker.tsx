"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActionPlanEntry, resetActionPlan, addActionPlanTask, removeActionPlanTask } from "@/lib/action-plan";
import {
  RESTAURANTS, DAYS, keys, nextDue, deadline, weekdayOf,
  weeklyStats, monthlyStats, overall, locationStats, vendorsPaid,
  type Entries, type WeeklyTask, type MonthlyTask, type VendorItem,
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

const INP = "w-full rounded-lg border border-[#E4DDE4] px-3 py-2 text-sm outline-none focus:border-[#440E48]";
const LABEL = "mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-[#726973]";
const TH = "border-b border-[#E4DDE4] bg-[#FAF7FB] px-3 py-2.5 text-left text-[11px] font-extrabold uppercase tracking-wide text-[#5b475d]";
const TD = "border-b border-[#EEEAEE] px-3 py-2.5 align-middle";

export function ActionPlanTracker({
  week, month, todayISO, entries: initial,
  weeklyTasks, monthlyTasks, vendors,
}: {
  week: string;
  month: string;
  todayISO: string;
  entries: Entries;
  weeklyTasks: WeeklyTask[];
  monthlyTasks: MonthlyTask[];
  vendors: VendorItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [entries, setEntries] = useState<Entries>(initial);
  const [, startTransition] = useTransition();
  const [resetting, setResetting] = useState(false);

  const today = useMemo(() => {
    const [y, m, d] = todayISO.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [todayISO]);

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
  const toggleWeekly = (taskId: string, day: number) => { const k = keys.weekly(taskId, day); setEntry(week, k, isOn(k) ? "" : "1"); };
  const toggleMonthlyAll = (taskId: string) => { const k = keys.monthlyAll(taskId); setEntry(month, k, isOn(k) ? "" : "1"); };
  const toggleMonthlyGrid = (taskId: string, loc: string) => { const k = keys.monthlyGrid(taskId, loc); setEntry(month, k, isOn(k) ? "" : "1"); };
  const toggleVendorReviewed = (vid: string) => { const k = keys.vendor(vid, "reviewed"); setEntry(month, k, isOn(k) ? "" : "1"); };

  const o = useMemo(() => overall(weeklyTasks, monthlyTasks, entries, today), [weeklyTasks, monthlyTasks, entries, today]);
  const wd = weekdayOf(today);

  async function handleRemoveTask(taskKey: string) {
    if (!confirm("Remove this item?")) return;
    await removeActionPlanTask(taskKey);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="m-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#F4A626]">Operations Tracker</div>
          <h1 className="mt-1 text-[24px] font-bold tracking-tight text-[#140516]">Area Manager Action Plan</h1>
          <p className="mt-0.5 text-sm text-[#726973]">Today: {fmtDate(today)} · Week {week} · Month {month}</p>
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
          <div className="mt-3 flex gap-2">
            <a href="/action-plan/pdf" className="inline-flex items-center gap-1.5 rounded-lg bg-[#440E48] px-3 py-1.5 text-xs font-bold text-white hover:brightness-110">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><polyline points="9 15 12 18 15 15" /></svg>
              Export PDF
            </a>
            <button disabled={resetting} onClick={async () => {
              if (!confirm("Reset all checkboxes and data for the current week/month? This cannot be undone.")) return;
              setResetting(true);
              await resetActionPlan(week, month);
              setEntries({});
              setResetting(false);
              router.refresh();
            }} className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4DDE4] bg-white px-3 py-1.5 text-xs font-bold text-[#e2445c] hover:bg-[#FEE2E2] disabled:opacity-50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
              {resetting ? "Resetting…" : "Reset"}
            </button>
          </div>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Completed" value={o.done} color="#1DBA87" />
        <Kpi label="Total Items" value={o.total} color="#440E48" />
        <Kpi label="Overdue" value={o.overdue} color="#e2445c" />
        <Kpi label="Vendor Payments" value={`${vendorsPaid(vendors, entries)}/${vendors.length}`} color="#F4A626" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${tab === id ? "bg-[#440E48] text-white shadow-sm" : "bg-white text-[#726973] ring-1 ring-inset ring-[#E4DDE4] hover:bg-[#FAF6FA]"}`}>{label}</button>
        ))}
      </div>

      {tab === "dashboard" && <DashboardTab weeklyTasks={weeklyTasks} monthlyTasks={monthlyTasks} entries={entries} today={today} o={o} />}
      {tab === "weekly" && <WeeklyTab tasks={weeklyTasks} entries={entries} today={today} wd={wd} toggle={toggleWeekly} onRemove={handleRemoveTask} refresh={() => router.refresh()} />}
      {tab === "monthly" && <MonthlyTab tasks={monthlyTasks} entries={entries} today={today} toggleAll={toggleMonthlyAll} toggleGrid={toggleMonthlyGrid} onRemove={handleRemoveTask} refresh={() => router.refresh()} />}
      {tab === "vendors" && <VendorsTab vendors={vendors} entries={entries} today={today} month={month} toggleReviewed={toggleVendorReviewed} setEntry={setEntry} onRemove={handleRemoveTask} refresh={() => router.refresh()} />}
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

function Check({ state, onClick }: { state: "done" | "overdue" | "open" | "na"; onClick?: () => void }) {
  const cls =
    state === "done" ? "bg-[#DCFCE7] border-[#bbf7d0] text-[#15803D]"
    : state === "overdue" ? "bg-[#FEE2E2] border-[#fecaca] text-[#DC2626]"
    : state === "na" ? "bg-[#F1F5F9] border-[#E4DDE4] text-[#cbd5e1] cursor-default"
    : "bg-white border-[#E4DDE4] text-[#A19BA2]";
  return (
    <span onClick={state === "na" ? undefined : onClick}
      className={`inline-flex h-8 min-w-9 items-center justify-center rounded-lg border text-sm font-extrabold select-none ${cls} ${state === "na" ? "" : "cursor-pointer"}`}>
      {state === "done" ? "✓" : state === "na" ? "—" : "□"}
    </span>
  );
}

function RemoveBtn({ taskKey, onRemove }: { taskKey: string; onRemove: (k: string) => void }) {
  return (
    <button onClick={() => onRemove(taskKey)} title="Remove" className="text-[#A19BA2] hover:text-[#e2445c]">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    </button>
  );
}

// ── Add Task Forms (inline, collapsible) ─────────────────────────────────

function AddWeeklyForm({ refresh }: { refresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [category, setCat] = useState("Operations");
  const [location, setLoc] = useState("All");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);

  if (!open) return <button onClick={() => setOpen(true)} className="m-btn-ghost text-xs">+ Add Weekly Task</button>;

  const toggleDay = (d: number) => setDays((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort());

  return (
    <div className="m-card space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className={LABEL}>Task name *</label><input className={INP} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className={LABEL}>Category</label><input className={INP} value={category} onChange={(e) => setCat(e.target.value)} /></div>
        <div><label className={LABEL}>Location</label><input className={INP} value={location} onChange={(e) => setLoc(e.target.value)} placeholder="All" /></div>
      </div>
      <div>
        <label className={LABEL}>Days</label>
        <div className="flex gap-2">{DAYS.map((d, i) => (
          <button key={i} onClick={() => toggleDay(i + 1)} className={`rounded-full px-3 py-1 text-xs font-bold ${days.includes(i + 1) ? "bg-[#440E48] text-white" : "bg-[#F0EBF0] text-[#726973]"}`}>{d}</button>
        ))}</div>
      </div>
      <div className="flex gap-2">
        <button disabled={pending} onClick={() => {
          start(async () => {
            await addActionPlanTask({ tab: "weekly", name, category, location: location || "All", days });
            setName(""); setOpen(false); refresh();
          });
        }} className="m-btn text-xs disabled:opacity-50">{pending ? "Adding…" : "Add"}</button>
        <button onClick={() => setOpen(false)} className="m-btn-ghost text-xs">Cancel</button>
      </div>
    </div>
  );
}

function AddMonthlyForm({ refresh }: { refresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [dueDay, setDueDay] = useState(1);
  const [deadlineMode, setDM] = useState<"same" | "next_month_15">("same");
  const [mode, setMode] = useState<"all" | "grid">("all");
  const [applicable, setApp] = useState<string[]>([...RESTAURANTS]);

  if (!open) return <button onClick={() => setOpen(true)} className="m-btn-ghost text-xs">+ Add Monthly Item</button>;

  const toggleLoc = (l: string) => setApp((p) => p.includes(l) ? p.filter((x) => x !== l) : [...p, l]);

  return (
    <div className="m-card space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className={LABEL}>Task name *</label><input className={INP} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className={LABEL}>Due day (1–28)</label><input type="number" min={1} max={28} className={INP} value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))} /></div>
        <div><label className={LABEL}>Deadline</label>
          <select className={INP} value={deadlineMode} onChange={(e) => setDM(e.target.value as "same" | "next_month_15")}>
            <option value="same">Same month</option>
            <option value="next_month_15">Next month 15th</option>
          </select>
        </div>
      </div>
      <div>
        <label className={LABEL}>Mode</label>
        <div className="flex gap-2">
          <button onClick={() => setMode("all")} className={`rounded-full px-3 py-1 text-xs font-bold ${mode === "all" ? "bg-[#440E48] text-white" : "bg-[#F0EBF0] text-[#726973]"}`}>All locations (1 checkbox)</button>
          <button onClick={() => setMode("grid")} className={`rounded-full px-3 py-1 text-xs font-bold ${mode === "grid" ? "bg-[#440E48] text-white" : "bg-[#F0EBF0] text-[#726973]"}`}>Per location (grid)</button>
        </div>
      </div>
      {mode === "grid" && (
        <div>
          <label className={LABEL}>Applicable locations</label>
          <div className="flex flex-wrap gap-2">{RESTAURANTS.map((l) => (
            <button key={l} onClick={() => toggleLoc(l)} className={`rounded-full px-3 py-1 text-xs font-bold ${applicable.includes(l) ? "bg-[#440E48] text-white" : "bg-[#F0EBF0] text-[#726973]"}`}>{l}</button>
          ))}</div>
        </div>
      )}
      <div className="flex gap-2">
        <button disabled={pending} onClick={() => {
          start(async () => {
            await addActionPlanTask({ tab: "monthly", name, dueDay, deadlineMode, mode, applicable: mode === "grid" ? applicable : [] });
            setName(""); setOpen(false); refresh();
          });
        }} className="m-btn text-xs disabled:opacity-50">{pending ? "Adding…" : "Add"}</button>
        <button onClick={() => setOpen(false)} className="m-btn-ghost text-xs">Cancel</button>
      </div>
    </div>
  );
}

function AddVendorForm({ refresh }: { refresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName] = useState("");

  if (!open) return <button onClick={() => setOpen(true)} className="m-btn-ghost text-xs">+ Add Vendor</button>;

  return (
    <div className="m-card flex items-end gap-3 p-4">
      <div className="flex-1"><label className={LABEL}>Vendor name *</label><input className={INP} value={name} onChange={(e) => setName(e.target.value)} /></div>
      <button disabled={pending} onClick={() => {
        start(async () => {
          await addActionPlanTask({ tab: "vendor", name });
          setName(""); setOpen(false); refresh();
        });
      }} className="m-btn text-xs disabled:opacity-50">{pending ? "Adding…" : "Add"}</button>
      <button onClick={() => setOpen(false)} className="m-btn-ghost text-xs">Cancel</button>
    </div>
  );
}

// ── Tab content ──────────────────────────────────────────────────────────

function DashboardTab({ weeklyTasks, monthlyTasks, entries, today, o }: {
  weeklyTasks: WeeklyTask[]; monthlyTasks: MonthlyTask[]; entries: Entries; today: Date; o: ReturnType<typeof overall>;
}) {
  const locs = locationStats(weeklyTasks, monthlyTasks, entries, today);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="m-card overflow-hidden">
        <div className="px-5 pt-4"><h3 className="text-base font-bold text-[#140516]">KPI by Category</h3><p className="mb-3 text-xs text-[#726973]">Completion by workstream.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm"><thead><tr><th className={TH}>Category</th><th className={`${TH} text-center`}>Total</th><th className={`${TH} text-center`}>Done</th><th className={`${TH} text-center`}>%</th></tr></thead>
          <tbody>{Object.entries(o.categories).map(([cat, v]) => {
            const pct = v.due ? Math.round((v.done / v.due) * 100) : 0;
            return (<tr key={cat}><td className={`${TD} font-semibold text-[#140516]`}>{cat}</td><td className={`${TD} text-center`}>{v.due}</td><td className={`${TD} text-center`}>{v.done}</td><td className={`${TD} text-center`}><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${pctBadge(pct)}`}>{pct}%</span></td></tr>);
          })}</tbody></table>
        </div>
      </section>
      <section className="m-card overflow-hidden">
        <div className="px-5 pt-4"><h3 className="text-base font-bold text-[#140516]">Location Completion</h3><p className="mb-3 text-xs text-[#726973]">Per-location tasks only.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm"><thead><tr><th className={TH}>Location</th><th className={`${TH} text-center`}>Completion</th></tr></thead>
          <tbody>{locs.map((l) => (<tr key={l.loc}><td className={`${TD} font-semibold text-[#140516]`}>{l.loc}</td><td className={`${TD} text-center`}><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${pctBadge(l.pct)}`}>{l.pct}%</span></td></tr>))}</tbody></table>
        </div>
      </section>
    </div>
  );
}

function WeeklyTab({ tasks, entries, today, wd, toggle, onRemove, refresh }: {
  tasks: WeeklyTask[]; entries: Entries; today: Date; wd: number;
  toggle: (id: string, day: number) => void; onRemove: (k: string) => void; refresh: () => void;
}) {
  return (
    <section className="space-y-3">
      <div className="m-card overflow-hidden">
        <div className="px-5 pt-4"><h3 className="text-base font-bold text-[#140516]">Weekly Tasks</h3><p className="mb-3 text-xs text-[#726973]">Click a day box when completed. Resets each week.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm"><thead><tr>
            <th className={TH}>Task</th><th className={TH}>Category</th><th className={TH}>Location</th>
            {DAYS.map((d) => <th key={d} className={`${TH} text-center`}>{d}</th>)}
            <th className={`${TH} text-center`}>Done</th><th className={`${TH} text-center`}>%</th><th className={`${TH} w-8`} />
          </tr></thead>
          <tbody>{tasks.map((t) => {
            const s = weeklyStats(t, entries, today);
            const pct = Math.round((s.done / s.due) * 100);
            return (<tr key={t.id}>
              <td className={`${TD} min-w-[220px] font-semibold text-[#140516]`}>{t.task}</td>
              <td className={TD}><span className="inline-flex rounded-full bg-[#F0EBF0] px-2 py-0.5 text-xs font-semibold text-[#5b475d]">{t.category}</span></td>
              <td className={`${TD} text-[#726973]`}>{t.location}</td>
              {[1,2,3,4,5].map((d) => {
                if (!t.days.includes(d)) return <td key={d} className={`${TD} text-center`}><Check state="na" /></td>;
                const done = entries[keys.weekly(t.id, d)] === "1";
                return <td key={d} className={`${TD} text-center`}><Check state={done ? "done" : (d <= wd && wd <= 5 ? "overdue" : "open")} onClick={() => toggle(t.id, d)} /></td>;
              })}
              <td className={`${TD} text-center`}>{s.done}/{s.due}</td>
              <td className={`${TD} text-center`}><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${pctBadge(pct)}`}>{pct}%</span></td>
              <td className={`${TD} text-center`}><RemoveBtn taskKey={t.id} onRemove={onRemove} /></td>
            </tr>);
          })}</tbody></table>
        </div>
      </div>
      <AddWeeklyForm refresh={refresh} />
    </section>
  );
}

function MonthlyTab({ tasks, entries, today, toggleAll, toggleGrid, onRemove, refresh }: {
  tasks: MonthlyTask[]; entries: Entries; today: Date;
  toggleAll: (id: string) => void; toggleGrid: (id: string, loc: string) => void;
  onRemove: (k: string) => void; refresh: () => void;
}) {
  return (
    <section className="space-y-3">
      <div className="m-card overflow-hidden">
        <div className="px-5 pt-4"><h3 className="text-base font-bold text-[#140516]">Monthly Action Items</h3><p className="mb-3 text-xs text-[#726973]">Per-location or combined checkbox. Resets each month.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-sm"><thead><tr>
            <th className={TH}>Task</th><th className={`${TH} text-center`}>Due</th><th className={`${TH} text-center`}>Deadline</th>
            {RESTAURANTS.map((r) => <th key={r} className={`${TH} text-center`}>{r}</th>)}
            <th className={`${TH} text-center`}>Done</th><th className={`${TH} text-center`}>%</th><th className={`${TH} w-8`} />
          </tr></thead>
          <tbody>{tasks.map((t) => {
            const s = monthlyStats(t, entries, today);
            const pct = Math.round((s.done / s.due) * 100);
            const past = today >= deadline(t, today);
            return (<tr key={t.id}>
              <td className={`${TD} min-w-[220px] font-semibold text-[#140516]`}>{t.task}</td>
              <td className={`${TD} text-center text-[#726973]`}>{fmtDate(nextDue(t.dueDay, today))}</td>
              <td className={`${TD} text-center text-[#726973]`}>{fmtDate(deadline(t, today))}</td>
              {t.mode === "all" ? (
                <td className={`${TD} text-center`} colSpan={RESTAURANTS.length}>
                  <Check state={entries[keys.monthlyAll(t.id)] === "1" ? "done" : past ? "overdue" : "open"} onClick={() => toggleAll(t.id)} />
                </td>
              ) : RESTAURANTS.map((loc) => {
                if (!(t.applicable ?? []).includes(loc)) return <td key={loc} className={`${TD} text-center`}><Check state="na" /></td>;
                const done = entries[keys.monthlyGrid(t.id, loc)] === "1";
                return <td key={loc} className={`${TD} text-center`}><Check state={done ? "done" : past ? "overdue" : "open"} onClick={() => toggleGrid(t.id, loc)} /></td>;
              })}
              <td className={`${TD} text-center`}>{s.done}/{s.due}</td>
              <td className={`${TD} text-center`}><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${pctBadge(pct)}`}>{pct}%</span></td>
              <td className={`${TD} text-center`}><RemoveBtn taskKey={t.id} onRemove={onRemove} /></td>
            </tr>);
          })}</tbody></table>
        </div>
      </div>
      <AddMonthlyForm refresh={refresh} />
    </section>
  );
}

function VendorsTab({ vendors, entries, today, month, toggleReviewed, setEntry, onRemove, refresh }: {
  vendors: VendorItem[]; entries: Entries; today: Date; month: string;
  toggleReviewed: (vid: string) => void; setEntry: (period: string, key: string, value: string) => void;
  onRemove: (k: string) => void; refresh: () => void;
}) {
  const due8 = nextDue(8, today);
  return (
    <section className="space-y-3">
      <div className="m-card overflow-hidden">
        <div className="px-5 pt-4"><h3 className="text-base font-bold text-[#140516]">Vendor Review Checklist</h3><p className="mb-3 text-xs text-[#726973]">Target payment date is the 8th of each month.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm"><thead><tr>
            <th className={TH}>Vendor</th><th className={`${TH} text-center`}>Reviewed</th><th className={TH}>Payment Date</th><th className={TH}>Notes</th><th className={`${TH} w-8`} />
          </tr></thead>
          <tbody>{vendors.map((v) => {
            const reviewed = entries[keys.vendor(v.id, "reviewed")] === "1";
            const payDate = entries[keys.vendor(v.id, "payDate")] ?? "";
            const note = entries[keys.vendor(v.id, "note")] ?? "";
            const overdue = !payDate && today >= due8;
            return (<tr key={v.id}>
              <td className={`${TD} font-semibold text-[#140516]`}>{v.name}</td>
              <td className={`${TD} text-center`}><Check state={reviewed ? "done" : "open"} onClick={() => toggleReviewed(v.id)} /></td>
              <td className={TD}><input type="date" defaultValue={payDate} className={`${INP} ${overdue ? "border-[#fecaca] bg-[#FEE2E2]" : payDate ? "bg-[#DCFCE7]" : ""}`} onChange={(e) => setEntry(month, keys.vendor(v.id, "payDate"), e.target.value)} /></td>
              <td className={TD}><input type="text" placeholder="Notes" defaultValue={note} className={INP} onBlur={(e) => setEntry(month, keys.vendor(v.id, "note"), e.target.value)} /></td>
              <td className={`${TD} text-center`}><RemoveBtn taskKey={v.id} onRemove={onRemove} /></td>
            </tr>);
          })}</tbody></table>
        </div>
      </div>
      <AddVendorForm refresh={refresh} />
    </section>
  );
}

function SummaryTab({ entries, week, setEntry }: { entries: Entries; week: string; setEntry: (period: string, key: string, value: string) => void }) {
  return (
    <section className="m-card p-5">
      <h3 className="text-base font-bold text-[#140516]">Weekly Performance Summary</h3>
      <p className="mb-4 text-xs text-[#726973]">Document what happened, what was fixed, what remains open, and follow-ups.</p>
      <div className="grid gap-4">
        {SUMMARY_FIELDS.map(([key, label]) => (
          <div key={key}><label className={LABEL}>{label}</label>
            <textarea defaultValue={entries[keys.summary(key)] ?? ""} rows={4} className={`${INP} min-h-[96px] resize-y leading-relaxed`} onBlur={(e) => setEntry(week, keys.summary(key), e.target.value)} /></div>
        ))}
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={LABEL}>Reviewed By</label><input type="text" defaultValue={entries[keys.summary("manager")] ?? ""} className={INP} onBlur={(e) => setEntry(week, keys.summary("manager"), e.target.value)} /></div>
          <div><label className={LABEL}>Date</label><input type="date" defaultValue={entries[keys.summary("date")] ?? ""} className={INP} onChange={(e) => setEntry(week, keys.summary("date"), e.target.value)} /></div>
        </div>
      </div>
    </section>
  );
}
