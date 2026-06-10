"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Priority, TaskStatus } from "@prisma/client";
import { changeTaskStatus, assignTask, quickAddTask, setTaskDue } from "@/lib/tasks";
import { createCategory, renameCategory, deleteCategory } from "@/lib/categories";
import { STATUS_LABEL, PRIORITY_LABEL } from "@/lib/labels";

const STATUS_HEX: Record<TaskStatus, string> = {
  PENDING: "#c4c4c4",
  IN_PROGRESS: "#fdab3d",
  DONE: "#00c875",
  VERIFIED: "#a25ddc",
  OVERDUE: "#e2445c",
};
const PRIORITY_HEX: Record<Priority, string> = {
  LOW: "#c4c4c4",
  MEDIUM: "#0073ea",
  HIGH: "#fdab3d",
  CRITICAL: "#e2445c",
};
const STATUS_OPTIONS: TaskStatus[] = ["PENDING", "IN_PROGRESS", "DONE", "VERIFIED"];
const SWATCHES = ["#0073ea", "#00c875", "#fdab3d", "#e2445c", "#a25ddc", "#1dba87", "#9f4000", "#676879"];

export type BoardTask = {
  id: string;
  title: string;
  status: TaskStatus;
  overdue: boolean;
  priority: Priority;
  dueAt: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
};
export type BoardGroup = { id: string; name: string; color: string; tasks: BoardTask[] };
type UserOpt = { id: string; name: string };
type Totals = { total: number; pending: number; inProgress: number; done: number; verified: number; overdue: number };

type ViewMode = "table" | "kanban" | "timeline" | "calendar" | "chart";

export function BoardView({
  groups,
  users,
  totals,
  canEdit,
  month,
}: {
  groups: BoardGroup[];
  users: UserOpt[];
  totals: Totals;
  canEdit: boolean;
  month: string; // YYYY-MM
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("table");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setErr(res.error ?? "Something went wrong");
      else setErr(null);
      router.refresh();
    });

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Total" value={totals.total} color="#323338" />
        <Kpi label="Pending" value={totals.pending} color="#9699a6" />
        <Kpi label="In Progress" value={totals.inProgress} color="#fdab3d" />
        <Kpi label="Done" value={totals.done} color="#00c875" />
        <Kpi label="Verified" value={totals.verified} color="#a25ddc" />
        <Kpi label="Overdue" value={totals.overdue} color="#e2445c" />
      </div>

      {err && (
        <div className="rounded-lg border border-[#f3d3d8] bg-[#fdf2f3] px-4 py-2 text-sm font-medium text-[#e2445c]">
          {err}
        </div>
      )}

      {/* View switcher + export */}
      <div className="flex items-center justify-between gap-2 border-b border-[#e6e9ef] print:hidden">
        <div className="flex items-center gap-1 overflow-x-auto">
          <ViewTab active={view === "table"} onClick={() => setView("table")} label="Main Table" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
          } />
          <ViewTab active={view === "kanban"} onClick={() => setView("kanban")} label="Kanban" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="6" height="18" rx="1"/><rect x="10" y="3" width="6" height="12" rx="1"/><rect x="17" y="3" width="4" height="8" rx="1"/></svg>
          } />
          <ViewTab active={view === "timeline"} onClick={() => setView("timeline")} label="Timeline" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
          } />
          <ViewTab active={view === "calendar"} onClick={() => setView("calendar")} label="Calendar" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          } />
          <ViewTab active={view === "chart"} onClick={() => setView("chart")} label="Chart" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          } />
        </div>
        <button onClick={() => window.print()} className="m-btn-ghost mb-1 shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          <span className="hidden sm:inline">Export PDF</span>
          <span className="sm:hidden">PDF</span>
        </button>
      </div>

      {view === "table" && (
        <>
          <div className="space-y-5">
            {groups.map((g) => (
              <Group key={g.id} group={g} users={users} canEdit={canEdit} run={run} />
            ))}
          </div>
          <div className="print:hidden">{canEdit && <AddCategory run={run} />}</div>
        </>
      )}
      {view === "kanban" && <Kanban groups={groups} canEdit={canEdit} run={run} />}
      {view === "timeline" && <Timeline groups={groups} month={month} />}
      {view === "calendar" && <CalendarView groups={groups} month={month} />}
      {view === "chart" && <ChartView groups={groups} totals={totals} />}
    </div>
  );
}

/* ── month/date helpers ── */
function monthParts(month: string) {
  const [y, m] = month.split("-").map(Number);
  const monthIndex = m - 1;
  const daysInMonth = new Date(Date.UTC(y, monthIndex + 1, 0)).getUTCDate();
  return { year: y, monthIndex, daysInMonth };
}
function dueParts(iso: string) {
  const d = new Date(iso);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() };
}

/* ── Timeline (Gantt-style) ── */
function Timeline({ groups, month }: { groups: BoardGroup[]; month: string }) {
  const { year, monthIndex, daysInMonth } = monthParts(month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  return (
    <div className="m-card overflow-x-auto p-4">
      <div className="min-w-[760px]">
        <div className="flex border-b border-[#eceef3] pb-1">
          <div className="w-44 shrink-0" />
          <div className="flex flex-1">
            {days.map((d) => (
              <div key={d} className="flex-1 text-center text-[10px] text-[#9699a6]">{d}</div>
            ))}
          </div>
        </div>
        {groups.map((g) => (
          <div key={g.id} className="border-b border-[#f4f5f8] last:border-0">
            <div className="mt-3 mb-1 text-xs font-bold" style={{ color: g.color }}>{g.name}</div>
            {g.tasks.map((t) => {
              const dp = t.dueAt ? dueParts(t.dueAt) : null;
              const inMonth = dp && dp.y === year && dp.m === monthIndex;
              const leftPct = inMonth ? ((dp!.d - 0.5) / daysInMonth) * 100 : null;
              return (
                <div key={t.id} className="flex items-center py-1">
                  <div className="w-44 shrink-0 truncate pr-3 text-xs text-[#323338]">{t.title}</div>
                  <div className="relative h-5 flex-1 rounded bg-[#f5f6f8]">
                    {leftPct !== null && (
                      <span
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
                        style={{ left: `${leftPct}%`, backgroundColor: t.overdue ? STATUS_HEX.OVERDUE : g.color }}
                        title={`${t.title} — due ${dp!.d}`}
                      >
                        {dp!.d}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Calendar ── */
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function CalendarView({ groups, month }: { groups: BoardGroup[]; month: string }) {
  const { year, monthIndex, daysInMonth } = monthParts(month);
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const tasks = groups.flatMap((g) => g.tasks.map((t) => ({ ...t, catColor: g.color })));
  const today = new Date();
  const isToday = (d: number) =>
    today.getUTCFullYear() === year && today.getUTCMonth() === monthIndex && today.getUTCDate() === d;

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="m-card overflow-x-auto p-4">
      <div className="min-w-[600px]">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[#676879]">
        {WEEKDAYS.map((d) => (<div key={d} className="py-1">{d}</div>))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const dayTasks = tasks.filter((t) => {
            const p = t.dueAt ? dueParts(t.dueAt) : null;
            return p && p.y === year && p.m === monthIndex && p.d === d;
          });
          return (
            <div key={i} className={`min-h-[92px] rounded-lg border p-1.5 ${isToday(d) ? "border-[#0073ea] bg-[#f5f9ff]" : "border-[#eceef3]"}`}>
              <div className={`mb-1 text-xs font-semibold ${isToday(d) ? "text-[#0073ea]" : "text-[#676879]"}`}>{d}</div>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map((t) => (
                  <div key={t.id} className="truncate rounded px-1 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: t.overdue ? STATUS_HEX.OVERDUE : t.catColor }} title={t.title}>
                    {t.title}
                  </div>
                ))}
                {dayTasks.length > 3 && <div className="text-[10px] text-[#9699a6]">+{dayTasks.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

/* ── Chart ── */
function ChartView({ groups, totals }: { groups: BoardGroup[]; totals: Totals }) {
  const statusData = [
    { label: "Pending", value: totals.pending, color: STATUS_HEX.PENDING },
    { label: "In Progress", value: totals.inProgress, color: STATUS_HEX.IN_PROGRESS },
    { label: "Done", value: totals.done, color: STATUS_HEX.DONE },
    { label: "Verified", value: totals.verified, color: STATUS_HEX.VERIFIED },
    { label: "Overdue", value: totals.overdue, color: STATUS_HEX.OVERDUE },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="m-card p-5">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#676879]">Status breakdown</h3>
        <div className="flex items-center gap-6">
          <Donut data={statusData} total={totals.total} />
          <ul className="space-y-1.5 text-sm">
            {statusData.map((s) => (
              <li key={s.label} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                <span className="text-[#323338]">{s.label}</span>
                <span className="ml-6 font-bold text-[#676879]">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="m-card p-5">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#676879]">Completion by category</h3>
        <div className="space-y-3">
          {groups.map((g) => {
            const total = g.tasks.length;
            const done = g.tasks.filter((t) => t.status === "DONE" || t.status === "VERIFIED").length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <div key={g.id} className="flex items-center gap-3">
                <span className="w-40 truncate text-sm font-medium text-[#323338]">{g.name}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#eceef3]">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: g.color }} />
                </div>
                <span className="w-10 text-right text-sm font-bold text-[#676879]">{pct}%</span>
              </div>
            );
          })}
          {groups.length === 0 && <p className="text-sm text-[#9699a6]">No categories yet.</p>}
        </div>
      </div>
    </div>
  );
}

function Donut({ data, total }: { data: { label: string; value: number; color: string }[]; total: number }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#eceef3" strokeWidth="16" />
      {total > 0 &&
        data.filter((d) => d.value > 0).map((d, i) => {
          const len = (d.value / total) * c;
          const el = (
            <circle
              key={i}
              cx="70" cy="70" r={r} fill="none" stroke={d.color} strokeWidth="16"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            />
          );
          offset += len;
          return el;
        })}
      <text x="70" y="66" textAnchor="middle" style={{ fontSize: 26, fontWeight: 800, fill: "#323338" }}>{total}</text>
      <text x="70" y="88" textAnchor="middle" style={{ fontSize: 11, fill: "#9699a6" }}>tasks</text>
    </svg>
  );
}

function ViewTab({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
        active ? "border-[#0073ea] text-[#0073ea]" : "border-transparent text-[#676879] hover:text-[#323338]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function initials(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const KANBAN_COLS: TaskStatus[] = ["PENDING", "IN_PROGRESS", "DONE", "VERIFIED"];

function Kanban({
  groups,
  canEdit,
  run,
}: {
  groups: BoardGroup[];
  canEdit: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const tasks = groups.flatMap((g) =>
    g.tasks.map((t) => ({ ...t, catName: g.name, catColor: g.color })),
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {KANBAN_COLS.map((status) => {
        const items = tasks.filter((t) => t.status === status);
        return (
          <div key={status} className="rounded-xl bg-[#f1f2f5] p-3">
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_HEX[status] }} />
              <span className="text-sm font-bold text-[#323338]">{STATUS_LABEL[status]}</span>
              <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#676879]">{items.length}</span>
            </div>
            <div className="space-y-2.5">
              {items.map((t) => (
                <KanbanCard key={t.id} task={t} canEdit={canEdit} run={run} />
              ))}
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-[#d6dae4] py-6 text-center text-xs text-[#9699a6]">
                  Nothing here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  task,
  canEdit,
  run,
}: {
  task: BoardTask & { catName: string; catColor: string };
  canEdit: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  return (
    <div className="rounded-lg bg-white p-3 shadow-sm" style={{ borderLeft: `4px solid ${task.catColor}` }}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: task.catColor }} />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#676879]">{task.catName}</span>
      </div>
      <div className="mb-2.5 text-sm font-semibold text-[#323338]">{task.title}</div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {task.assigneeName ? (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[#0073ea] text-[10px] font-bold text-white" title={task.assigneeName}>
              {initials(task.assigneeName)}
            </span>
          ) : (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[#e6e9ef] text-[10px] text-[#9699a6]" title="Unassigned">—</span>
          )}
          <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ backgroundColor: PRIORITY_HEX[task.priority] }}>
            {PRIORITY_LABEL[task.priority]}
          </span>
        </div>
        <span className={`text-xs font-medium ${task.overdue ? "text-[#e2445c]" : "text-[#9699a6]"}`}>
          {task.dueAt ? task.dueAt.slice(5, 10) : "—"}
        </span>
      </div>

      {canEdit && (
        <select
          value={task.status}
          onChange={(e) => run(() => changeTaskStatus(task.id, e.target.value as TaskStatus))}
          className="mt-2.5 w-full cursor-pointer rounded-md border-none px-2 py-1 text-xs font-semibold text-white outline-none"
          style={{ backgroundColor: STATUS_HEX[task.overdue ? "OVERDUE" : task.status] }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s} className="bg-white text-[#323338]">Move to: {STATUS_LABEL[s]}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function Group({
  group,
  users,
  canEdit,
  run,
}: {
  group: BoardGroup;
  users: UserOpt[];
  canEdit: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [newTitle, setNewTitle] = useState("");

  const total = group.tasks.length;
  const done = group.tasks.filter((t) => t.status === "DONE" || t.status === "VERIFIED").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <section className="m-card overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-3 border-b border-[#eceef3] px-4 py-3" style={{ borderLeft: `5px solid ${group.color}` }}>
        <button onClick={() => setOpen((o) => !o)} className="text-[#676879]" aria-label="Toggle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => { setEditing(false); if (name.trim() && name !== group.name) run(() => renameCategory(group.id, name)); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className="rounded-md border border-[#0073ea] px-2 py-1 text-sm font-bold outline-none"
            style={{ color: group.color }}
          />
        ) : (
          <h2
            className="text-base font-bold"
            style={{ color: group.color }}
            onDoubleClick={() => canEdit && setEditing(true)}
            title={canEdit ? "Double-click to rename" : undefined}
          >
            {group.name}
          </h2>
        )}
        <span className="rounded-full bg-[#f3f4f7] px-2 py-0.5 text-xs font-semibold text-[#676879]">{total}</span>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden h-2 w-28 overflow-hidden rounded-full bg-[#eceef3] sm:block">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: group.color }} />
          </div>
          <span className="text-xs font-bold text-[#676879]">{pct}%</span>
          {canEdit && (
            <button
              onClick={() => { if (confirm(`Delete category "${group.name}"? Its tasks are kept but uncategorized.`)) run(() => deleteCategory(group.id)); }}
              className="text-[#9699a6] hover:text-[#e2445c]"
              title="Delete category"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {open && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead className="border-b border-[#eceef3] bg-[#f9fafc] text-left text-xs font-semibold uppercase tracking-wider text-[#676879]">
                <tr>
                  <th className="px-4 py-2.5">Task</th>
                  <th className="px-4 py-2.5 w-44">Owner</th>
                  <th className="px-4 py-2.5 w-36">Due date</th>
                  <th className="px-4 py-2.5 w-28">Priority</th>
                  <th className="px-4 py-2.5 w-40">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f2f5]">
                {group.tasks.map((t) => (
                  <Row key={t.id} task={t} color={group.color} users={users} canEdit={canEdit} run={run} />
                ))}
                {group.tasks.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-4 text-sm text-[#9699a6]">No tasks yet.</td></tr>
                )}
                {canEdit && (
                  <tr className="print:hidden">
                    <td colSpan={5} className="px-4 py-2">
                      <input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newTitle.trim()) {
                            run(() => quickAddTask(group.id, newTitle));
                            setNewTitle("");
                          }
                        }}
                        placeholder="+ Add task and press Enter"
                        className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-[#323338] outline-none placeholder:text-[#9699a6] hover:border-[#e6e9ef] focus:border-[#0073ea]"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-[#f1f2f5] sm:hidden">
            {group.tasks.map((t) => (
              <TaskCard key={t.id} task={t} color={group.color} users={users} canEdit={canEdit} run={run} />
            ))}
            {group.tasks.length === 0 && <p className="px-4 py-4 text-sm text-[#9699a6]">No tasks yet.</p>}
            {canEdit && (
              <div className="px-4 py-2.5 print:hidden">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTitle.trim()) {
                      run(() => quickAddTask(group.id, newTitle));
                      setNewTitle("");
                    }
                  }}
                  placeholder="+ Add task and press Enter"
                  className="w-full rounded-md border border-[#e6e9ef] bg-white px-3 py-2 text-sm text-[#323338] outline-none placeholder:text-[#9699a6] focus:border-[#0073ea]"
                />
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

type CellProps = {
  task: BoardTask;
  users?: UserOpt[];
  canEdit: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
};

function PriorityPill({ priority }: { priority: Priority }) {
  return (
    <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ backgroundColor: PRIORITY_HEX[priority] }}>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

function OwnerControl({ task, users = [], canEdit, run }: CellProps) {
  if (!canEdit) return <span className="text-[#676879]">{task.assigneeName ?? "—"}</span>;
  return (
    <select
      value={task.assigneeId ?? ""}
      onChange={(e) => run(() => assignTask(task.id, e.target.value))}
      className="w-full rounded-md border border-[#e6e9ef] bg-white px-2 py-1.5 text-sm text-[#323338] outline-none hover:border-[#c3c6d4] focus:border-[#0073ea]"
    >
      <option value="">— Unassigned —</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>{u.name}</option>
      ))}
    </select>
  );
}

function DueControl({ task, canEdit, run }: CellProps) {
  if (!canEdit)
    return (
      <span className={task.overdue ? "font-medium text-[#e2445c]" : "text-[#676879]"}>
        {task.dueAt ? task.dueAt.slice(0, 10) : "—"}
      </span>
    );
  return (
    <input
      type="date"
      value={task.dueAt ? task.dueAt.slice(0, 10) : ""}
      onChange={(e) =>
        run(() => setTaskDue(task.id, e.target.value ? new Date(`${e.target.value}T17:00:00Z`).toISOString() : null))
      }
      className={`w-full rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[#0073ea] ${task.overdue ? "border-[#e2445c] text-[#e2445c]" : "border-[#e6e9ef] text-[#323338]"}`}
    />
  );
}

function StatusControl({ task, canEdit, run }: CellProps) {
  const display: TaskStatus = task.overdue ? "OVERDUE" : task.status;
  if (!canEdit)
    return (
      <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ backgroundColor: STATUS_HEX[display] }}>
        {STATUS_LABEL[display]}
      </span>
    );
  return (
    <select
      value={task.status}
      onChange={(e) => run(() => changeTaskStatus(task.id, e.target.value as TaskStatus))}
      className="w-full cursor-pointer rounded-md border-none px-2.5 py-1.5 text-sm font-semibold text-white outline-none"
      style={{ backgroundColor: STATUS_HEX[display] }}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s} className="bg-white text-[#323338]">{STATUS_LABEL[s]}</option>
      ))}
    </select>
  );
}

function Row({
  task,
  color,
  users,
  canEdit,
  run,
}: {
  task: BoardTask;
  color: string;
  users: UserOpt[];
  canEdit: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  return (
    <tr className="hover:bg-[#f9fafc]">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="h-7 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-medium text-[#323338]">{task.title}</span>
        </div>
      </td>
      <td className="px-4 py-2.5"><OwnerControl task={task} users={users} canEdit={canEdit} run={run} /></td>
      <td className="px-4 py-2.5"><DueControl task={task} canEdit={canEdit} run={run} /></td>
      <td className="px-4 py-2.5"><PriorityPill priority={task.priority} /></td>
      <td className="px-4 py-2.5"><StatusControl task={task} canEdit={canEdit} run={run} /></td>
    </tr>
  );
}

/* Mobile: each task as a stacked card (the table doesn't fit a phone). */
function TaskCard({
  task,
  color,
  users,
  canEdit,
  run,
}: {
  task: BoardTask;
  color: string;
  users: UserOpt[];
  canEdit: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  return (
    <div className="space-y-2.5 px-4 py-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 h-5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="flex-1 text-sm font-semibold text-[#323338]">{task.title}</span>
        <PriorityPill priority={task.priority} />
      </div>
      <StatusControl task={task} canEdit={canEdit} run={run} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#9699a6]">Owner</div>
          <OwnerControl task={task} users={users} canEdit={canEdit} run={run} />
        </div>
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#9699a6]">Due</div>
          <DueControl task={task} canEdit={canEdit} run={run} />
        </div>
      </div>
    </div>
  );
}

function AddCategory({ run }: { run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="m-btn-ghost">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add category
      </button>
    );
  }
  return (
    <div className="m-card flex flex-wrap items-center gap-3 p-4">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name"
        className="flex-1 rounded-md border border-[#e6e9ef] px-3 py-2 text-sm outline-none focus:border-[#0073ea]"
      />
      <div className="flex items-center gap-1.5">
        {SWATCHES.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className="h-6 w-6 rounded-full"
            style={{ backgroundColor: c, outline: color === c ? "2px solid #323338" : "none", outlineOffset: "2px" }}
            aria-label={c}
          />
        ))}
      </div>
      <button
        onClick={() => { if (name.trim()) { run(() => createCategory({ name, color })); setName(""); setOpen(false); } }}
        className="m-btn"
      >
        Add
      </button>
      <button onClick={() => setOpen(false)} className="m-btn-ghost">Cancel</button>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="m-card relative overflow-hidden p-4">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
      <div className="text-3xl font-extrabold" style={{ color }}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-[#676879]">{label}</div>
    </div>
  );
}
