"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Priority, TaskStatus } from "@prisma/client";
import { changeTaskStatus, setTaskDue } from "@/lib/tasks";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/labels";

type Cat = { name: string; color: string; total: number; done: number; pct: number };
type Loc = { name: string; total: number; done: number; pct: number };
type Task = {
  id: string; title: string; status: TaskStatus; derived: TaskStatus; priority: Priority;
  categoryName: string | null; categoryColor: string | null; locationName: string;
  dueAt: string | null; proofRequired: boolean; weekCol: number | null; inMonth: boolean;
};
type Data = {
  counts: { total: number; done: number; overdue: number; dueToday: number };
  overallPct: number; byCategory: Cat[]; byLocation: Loc[];
  byStatus: Record<string, number>; weekDays: { label: string; day: number; iso: string }[]; tasks: Task[];
};

const EXTRA_TABS = ["Dashboard", "Summary"] as const;

// ── Type grouping ────────────────────────────────────────────────────────────
// Recurring tasks come titled "[Daily] …" / "[Weekly] …" / "[Monthly] …"; anything
// else is a one-off, grouped under "Other".
const TYPE_ORDER = ["Daily", "Weekly", "Monthly", "Other"] as const;
type TaskType = (typeof TYPE_ORDER)[number];
const TYPE_COLOR: Record<TaskType, string> = { Daily: "#5B8DD9", Weekly: "#440E48", Monthly: "#F4A626", Other: "#726973" };

function taskType(title: string): TaskType {
  const m = title.match(/^\[(Daily|Weekly|Monthly)\]/);
  return (m ? (m[1] as TaskType) : "Other");
}
function stripType(title: string): string {
  return title.replace(/^\[(Daily|Weekly|Monthly)\]\s*/, "");
}
const isDone = (t: Task) => t.status === "DONE" || t.status === "VERIFIED";

function dueBadge(t: Task): { text: string; cls: string } {
  if (!t.dueAt) return { text: "No date", cls: "text-[#C9C4C9]" };
  const text = new Date(t.dueAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  if (t.derived === "OVERDUE") return { text: `${text} · overdue`, cls: "font-semibold text-[#e2445c]" };
  return { text, cls: "text-[#726973]" };
}

function useTaskMutations(setErr: (s: string | null) => void) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const call = (id: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setErr(null);
    setBusyId(id);
    startTransition(async () => {
      const res = await fn();
      setBusyId(null);
      if (!res.ok) setErr(res.error ?? "Could not update the task.");
      else router.refresh();
    });
  };

  const toggleDone = (t: Task) => {
    if (!isDone(t) && t.proofRequired) {
      setErr(`"${t.title}" needs photo proof — open the task to complete it.`);
      return;
    }
    call(t.id, () => changeTaskStatus(t.id, isDone(t) ? "IN_PROGRESS" : "DONE"));
  };
  const moveDue = (t: Task, iso: string | null) => call(t.id, () => setTaskDue(t.id, iso));

  return { busyId, toggleDone, moveDue };
}

export function TaskTracker({
  name, roleLabel, locationName, todayLabel, data, editable = true,
}: {
  name: string; roleLabel: string; locationName: string | null; todayLabel: string; data: Data; editable?: boolean;
}) {
  const typeTabs = TYPE_ORDER.filter((k) => data.tasks.some((t) => taskType(t.title) === k));
  const tabs: string[] = [...typeTabs, ...EXTRA_TABS];
  const [tab, setTab] = useState<string>(typeTabs[0] ?? "Dashboard");
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header */}
      <div className="m-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#F4A626]">Task Tracker</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#140516]">{name}&apos;s Tracker</h1>
            <p className="mt-0.5 text-sm text-[#726973]">{roleLabel}{locationName ? ` · ${locationName}` : ""} · Today: {todayLabel}</p>
          </div>
          <div className="min-w-[220px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#726973]">Overall Completion</span>
              <span className="text-2xl font-extrabold text-[#440E48]">{data.overallPct}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#EEEAEE]">
              <div className="h-full rounded-full bg-[#440E48]" style={{ width: `${data.overallPct}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#e2445c]">{data.counts.overdue} overdue task{data.counts.overdue === 1 ? "" : "s"}</span>
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-[#440E48] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#5a1560] print:hidden">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile value={data.counts.done} label="Completed" color="#1DBA87" />
        <StatTile value={data.counts.total} label="Total Items" color="#440E48" />
        <StatTile value={data.counts.overdue} label="Overdue" color="#e2445c" />
        <StatTile value={data.counts.dueToday} label="Due Today" color="#F4A626" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 print:hidden">
        {tabs.map((t) => {
          const isType = (TYPE_ORDER as readonly string[]).includes(t);
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${tab === t ? "bg-[#440E48] text-white" : "border border-[#E4DDE4] text-[#726973] hover:bg-[#FAF6FA]"}`}>
              {isType && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tab === t ? "#ffffff" : TYPE_COLOR[t as TaskType] }} />}
              {t}
            </button>
          );
        })}
      </div>

      {!editable && (
        <div className="rounded-lg border border-[#E4DDE4] bg-[#FAF6FA] px-3 py-2 text-xs font-medium text-[#726973]">
          Viewing {name}&apos;s tracker — read-only.
        </div>
      )}
      {err && <div className="rounded-lg border border-[#f3d3d8] bg-[#fdf2f3] px-3 py-2 text-xs font-medium text-[#e2445c]">{err}</div>}

      {tab === "Weekly" && <WeeklyGridTab data={data} setErr={setErr} editable={editable} />}
      {typeTabs.includes(tab as TaskType) && tab !== "Weekly" && <TypeTab type={tab as TaskType} data={data} setErr={setErr} editable={editable} />}
      {tab === "Dashboard" && <DashboardTab data={data} />}
      {tab === "Summary" && <SummaryTab data={data} />}
    </div>
  );
}

// ── One tab per recurrence type (Daily / Weekly / Monthly / Other) ──────────────

function TypeTab({ type, data, setErr, editable }: { type: TaskType; data: Data; setErr: (s: string | null) => void; editable: boolean }) {
  const [hideDone, setHideDone] = useState(true);
  const mut = useTaskMutations(setErr);

  const rank = (t: Task) => (isDone(t) ? 2 : t.derived === "OVERDUE" ? 0 : 1);
  const all = [...data.tasks.filter((t) => taskType(t.title) === type)]
    .sort((a, b) => rank(a) - rank(b) || (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));
  const done = all.filter(isDone).length;
  const shown = hideDone ? all.filter((t) => !isDone(t)) : all;
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;

  return (
    <section className="m-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_COLOR[type] }} />
          <h2 className="text-base font-bold text-[#140516]">{type} tasks</h2>
          <span className="text-xs font-medium text-[#A19BA2]">{done}/{all.length} done · {pct}%</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#EEEAEE]">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: TYPE_COLOR[type] }} />
          </div>
          <button onClick={() => setHideDone((v) => !v)} className="rounded-lg border border-[#E4DDE4] px-3 py-1.5 text-xs font-semibold text-[#726973] hover:bg-[#FAF6FA]">
            {hideDone ? "Show completed" : "Hide completed"}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {shown.map((t) => <TaskRow key={t.id} t={t} editable={editable} mut={mut} />)}
        {shown.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#E4DDE4] py-6 text-center text-sm text-[#A19BA2]">{all.length === 0 ? "No tasks." : "All done 🎉"}</div>
        )}
      </div>
    </section>
  );
}

// ── Weekly tab as a Monday–Sunday grid (task × weekday) ─────────────────────────

function WeeklyGridTab({ data, setErr, editable }: { data: Data; setErr: (s: string | null) => void; editable: boolean }) {
  const mut = useTaskMutations(setErr);
  const rows = [...data.tasks.filter((t) => taskType(t.title) === "Weekly")]
    .sort((a, b) => (a.weekCol ?? 9) - (b.weekCol ?? 9) || stripType(a.title).localeCompare(stripType(b.title)));

  return (
    <section className="m-card p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-base font-bold text-[#140516]">Weekly tasks</h2>
        <span className="text-xs text-[#A19BA2]">{rows.length} task{rows.length === 1 ? "" : "s"}</span>
      </div>
      <p className="mb-3 text-xs text-[#A19BA2]">{editable ? "Click a day to schedule or move a task · click its own day again to mark done." : "Each task's scheduled day is highlighted; green means done."}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-[#eee] text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">
              <th className="py-2 text-left">Task</th>
              {data.weekDays.map((d) => (
                <th key={d.label} className="w-14 py-2 text-center">{d.label}<div className="text-[#C9C4C9]">{d.day}</div></th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3eef3]">
            {rows.map((t) => {
              const done = isDone(t);
              return (
                <tr key={t.id}>
                  <td className="py-2.5 pr-3">
                    <Link href={`/tasks/${t.id}`} className={`text-sm font-medium hover:text-[#440E48] ${done ? "text-[#A19BA2] line-through" : "text-[#140516]"}`}>{stripType(t.title)}</Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[#A19BA2]">
                      {t.categoryName && <span className="inline-flex rounded px-1.5 py-0.5 font-semibold" style={{ backgroundColor: `${t.categoryColor ?? "#440E48"}1a`, color: t.categoryColor ?? "#440E48" }}>{t.categoryName}</span>}
                      <span>{t.locationName}</span>
                      {t.weekCol === null && <span className="italic text-[#C9C4C9]">· unscheduled</span>}
                    </div>
                  </td>
                  {data.weekDays.map((d, col) => (
                    <td key={col} className="py-2.5 text-center">
                      <DayCell
                        scheduled={t.weekCol === col}
                        done={done}
                        unscheduled={t.weekCol === null}
                        busy={mut.busyId === t.id}
                        editable={editable}
                        onClick={() => (t.weekCol === col ? mut.toggleDone(t) : mut.moveDue(t, d.iso))}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-sm text-[#A19BA2]">No weekly tasks.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DayCell({ scheduled, done, unscheduled, busy, editable, onClick }: { scheduled: boolean; done: boolean; unscheduled: boolean; busy: boolean; editable: boolean; onClick: () => void }) {
  const mark = scheduled
    ? (done
        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        : <span className="h-2 w-2 rounded-sm bg-white" />)
    : null;
  const base = scheduled
    ? done ? "border-[#1DBA87] bg-[#1DBA87] text-white" : "border-[#440E48] bg-[#440E48] text-white"
    : unscheduled ? "border-dashed border-[#D9C9DD] text-transparent" : "border-[#E4DDE4] text-transparent";

  if (!editable) {
    return <span className={`inline-grid h-6 w-6 place-items-center rounded-md border-2 ${base}`}>{mark}</span>;
  }
  const hover = scheduled ? "" : "hover:border-[#440E48] hover:bg-[#FAF6FA]";
  return (
    <button onClick={onClick} disabled={busy} title={scheduled ? (done ? "Mark not done" : "Mark done") : "Move to this day"}
      className={`grid h-6 w-6 place-items-center rounded-md border-2 transition-colors disabled:opacity-40 ${base} ${hover}`}>
      {mark}
    </button>
  );
}

function TaskRow({ t, editable, mut }: { t: Task; editable: boolean; mut: ReturnType<typeof useTaskMutations> }) {
  const done = isDone(t);
  const due = dueBadge(t);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#EEEAEE] px-3 py-2.5">
      {editable ? (
        <button onClick={() => mut.toggleDone(t)} disabled={mut.busyId === t.id} title={done ? "Reopen" : "Mark done"}
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors disabled:opacity-50 ${done ? "border-[#1DBA87] bg-[#1DBA87] text-white" : "border-[#D0CDD0] text-transparent hover:border-[#1DBA87] hover:text-[#1DBA87]"}`}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </button>
      ) : (
        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${done ? "border-[#1DBA87] bg-[#1DBA87] text-white" : "border-[#D0CDD0] text-transparent"}`}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </span>
      )}
      <div className="min-w-0 flex-1">
        <Link href={`/tasks/${t.id}`} className={`truncate text-sm font-medium hover:text-[#440E48] ${done ? "text-[#A19BA2] line-through" : "text-[#140516]"}`}>{stripType(t.title)}</Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          {t.categoryName && <span className="inline-flex rounded px-1.5 py-0.5 font-semibold" style={{ backgroundColor: `${t.categoryColor ?? "#440E48"}1a`, color: t.categoryColor ?? "#440E48" }}>{t.categoryName}</span>}
          <span className="text-[#A19BA2]">{t.locationName}</span>
          <span className={due.cls}>· {due.text}</span>
        </div>
      </div>
      {editable ? (
        <input type="date" value={t.dueAt ? t.dueAt.slice(0, 10) : ""} disabled={mut.busyId === t.id}
          onChange={(e) => mut.moveDue(t, e.target.value ? `${e.target.value}T12:00:00` : null)}
          className="hidden shrink-0 rounded-md border border-[#E4DDE4] bg-white px-2 py-1 text-xs text-[#726973] outline-none focus:border-[#440E48] sm:block" />
      ) : (
        <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 sm:inline-flex ${STATUS_STYLE[t.derived]}`}>{STATUS_LABEL[t.derived]}</span>
      )}
    </div>
  );
}

// ── Dashboard + Summary (analytics) ────────────────────────────────────────────

function DashboardTab({ data }: { data: Data }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="m-card p-5">
        <h2 className="mb-3 text-base font-bold text-[#140516]">KPI by Category</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">
            <tr className="border-b border-[#eee]"><th className="py-2">Category</th><th className="py-2 w-16 text-right">Total</th><th className="py-2 w-16 text-right">Done</th><th className="py-2 w-16 text-right">%</th></tr>
          </thead>
          <tbody className="divide-y divide-[#f3eef3]">
            {data.byCategory.map((c) => (
              <tr key={c.name}>
                <td className="py-2.5"><span className="inline-flex items-center gap-2 font-medium text-[#140516]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />{c.name}</span></td>
                <td className="py-2.5 text-right tabular-nums text-[#726973]">{c.total}</td>
                <td className="py-2.5 text-right tabular-nums text-[#726973]">{c.done}</td>
                <td className="py-2.5 text-right"><PctBadge pct={c.pct} /></td>
              </tr>
            ))}
            {data.byCategory.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-sm text-[#A19BA2]">No tasks assigned.</td></tr>}
          </tbody>
        </table>
      </section>
      <section className="m-card p-5">
        <h2 className="mb-3 text-base font-bold text-[#140516]">Location Completion</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">
            <tr className="border-b border-[#eee]"><th className="py-2">Location</th><th className="py-2 w-40 text-right">Completion</th></tr>
          </thead>
          <tbody className="divide-y divide-[#f3eef3]">
            {data.byLocation.map((l) => (
              <tr key={l.name}>
                <td className="py-2.5 font-medium text-[#140516]">{l.name}</td>
                <td className="py-2.5"><div className="flex items-center justify-end gap-2"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#EEEAEE]"><div className="h-full rounded-full bg-[#1DBA87]" style={{ width: `${l.pct}%` }} /></div><PctBadge pct={l.pct} /></div></td>
              </tr>
            ))}
            {data.byLocation.length === 0 && <tr><td colSpan={2} className="py-6 text-center text-sm text-[#A19BA2]">No tasks assigned.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function SummaryTab({ data }: { data: Data }) {
  const statusOrder: TaskStatus[] = ["PENDING", "IN_PROGRESS", "OVERDUE", "DONE", "VERIFIED"];
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="m-card p-5">
        <h2 className="mb-3 text-base font-bold text-[#140516]">By Status</h2>
        <div className="space-y-2">
          {statusOrder.map((s) => (
            <div key={s} className="flex items-center justify-between">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${STATUS_STYLE[s]}`}>{STATUS_LABEL[s]}</span>
              <span className="text-sm font-bold tabular-nums text-[#140516]">{data.byStatus[s] ?? 0}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="m-card p-5">
        <h2 className="mb-3 text-base font-bold text-[#140516]">By Category</h2>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-[#f3eef3]">
            {data.byCategory.map((c) => (
              <tr key={c.name}>
                <td className="py-2"><span className="inline-flex items-center gap-2 font-medium text-[#140516]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />{c.name}</span></td>
                <td className="py-2 text-right text-[#726973]">{c.done}/{c.total}</td>
                <td className="py-2 text-right"><PctBadge pct={c.pct} /></td>
              </tr>
            ))}
            {data.byCategory.length === 0 && <tr><td className="py-6 text-center text-sm text-[#A19BA2]">No tasks assigned.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function StatTile({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="m-card relative overflow-hidden p-5">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
      <div className="text-3xl font-extrabold" style={{ color }}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-[#726973]">{label}</div>
    </div>
  );
}

function PctBadge({ pct }: { pct: number }) {
  const style = pct >= 80 ? "bg-[#1DBA871a] text-[#1DBA87]" : pct >= 40 ? "bg-[#F4A6261a] text-[#B45309]" : "bg-[#e2445c1a] text-[#e2445c]";
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold ${style}`}>{pct}%</span>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-[#E4DDE4] py-8 text-center text-sm text-[#A19BA2]">{children}</div>;
}
