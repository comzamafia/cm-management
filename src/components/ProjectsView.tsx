"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileDropzone } from "./FileDropzone";
import { Priority, ProjectStatus, TaskStatus } from "@prisma/client";
import {
  changeProjectStatus,
  assignProjectOwner,
  setProjectPriority,
  setProjectTimeline,
  setProjectClient,
  renameProject,
  deleteProject,
  quickAddProject,
  addProjectTask,
  addProjectFile,
  removeProjectFile,
  type ProjectRow,
} from "@/lib/projects";
import { changeTaskStatus, assignTask } from "@/lib/tasks";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_HEX,
  PROJECT_STATUS_ORDER,
} from "@/lib/labels";

const PRIORITY_HEX: Record<Priority, string> = {
  LOW: "#A19BA2",
  MEDIUM: "#5B8DD9",
  HIGH: "#F4A626",
  CRITICAL: "#e2445c",
};
const PRIORITY_OPTIONS: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const TASK_STATUS_HEX: Record<TaskStatus, string> = {
  PENDING: "#A19BA2",
  IN_PROGRESS: "#F4A626",
  DONE: "#1DBA87",
  VERIFIED: "#440E48",
  OVERDUE: "#e2445c",
};
const TASK_STATUS_OPTIONS: TaskStatus[] = ["PENDING", "IN_PROGRESS", "DONE", "VERIFIED"];

type UserOpt = { id: string; name: string };
type LocationOpt = { id: string; name: string };
type Totals = {
  total: number;
  notStarted: number;
  inProgress: number;
  onHold: number;
  completed: number;
  cancelled: number;
  overdue: number;
};
type ViewMode = "table" | "kanban" | "timeline" | "portfolio";
type Action = () => Promise<{ ok: boolean; error?: string }>;
type Filters = { q: string; ownerId: string; priority: string; status: string; locationId: string };

function initials(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
function fmtRange(start: string | null, due: string | null): string {
  const f = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (start && due) return `${f(start)} → ${f(due)}`;
  if (due) return `Due ${f(due)}`;
  if (start) return `From ${f(start)}`;
  return "—";
}

export function ProjectsView({
  rows,
  users,
  locations,
  totals,
  canEdit,
}: {
  rows: ProjectRow[];
  users: UserOpt[];
  locations: LocationOpt[];
  totals: Totals;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("table");
  const [filters, setFilters] = useState<Filters>({ q: "", ownerId: "", priority: "", status: "", locationId: "" });
  const multiLoc = locations.length > 1;

  const run = (fn: Action) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setErr(res.error ?? "Something went wrong");
      else setErr(null);
      router.refresh();
    });

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !(`${r.name} ${r.client ?? ""}`.toLowerCase().includes(q))) return false;
      if (filters.ownerId && r.ownerId !== filters.ownerId) return false;
      if (filters.priority && r.priority !== filters.priority) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (filters.locationId && r.locationId !== filters.locationId) return false;
      return true;
    });
  }, [rows, filters]);

  const filterActive = filters.q || filters.ownerId || filters.priority || filters.status || filters.locationId;

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Projects" value={totals.total} color="#440E48" />
        <Kpi label="Not Started" value={totals.notStarted} color="#A19BA2" />
        <Kpi label="Working on it" value={totals.inProgress} color="#F4A626" />
        <Kpi label="Stuck" value={totals.onHold} color="#e2445c" />
        <Kpi label="Done" value={totals.completed} color="#1DBA87" />
        <Kpi label="Overdue" value={totals.overdue} color="#9F4000" />
      </div>

      {err && (
        <div className="rounded-lg border border-[#f3d3d8] bg-[#fdf2f3] px-4 py-2 text-sm font-medium text-[#e2445c]">
          {err}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="relative flex-1 min-w-[180px]">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A19BA2]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="Search project or client…"
            className="w-full rounded-lg border border-[#E4DDE4] bg-white py-2 pl-9 pr-3 text-sm text-[#140516] outline-none focus:border-[#440E48]"
          />
        </div>
        {multiLoc && (
          <FilterSelect value={filters.locationId} onChange={(v) => setFilters((f) => ({ ...f, locationId: v }))} label="Location"
            options={locations.map((l) => ({ value: l.id, label: l.name }))} />
        )}
        <FilterSelect value={filters.ownerId} onChange={(v) => setFilters((f) => ({ ...f, ownerId: v }))} label="Owner"
          options={users.map((u) => ({ value: u.id, label: u.name }))} />
        <FilterSelect value={filters.priority} onChange={(v) => setFilters((f) => ({ ...f, priority: v }))} label="Priority"
          options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))} />
        <FilterSelect value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} label="Status"
          options={PROJECT_STATUS_ORDER.map((s) => ({ value: s, label: PROJECT_STATUS_LABEL[s] }))} />
        {filterActive && (
          <button onClick={() => setFilters({ q: "", ownerId: "", priority: "", status: "", locationId: "" })} className="m-btn-ghost">
            Clear
          </button>
        )}
        {filterActive && (
          <span className="text-xs font-medium text-[#726973]">{filtered.length} of {rows.length}</span>
        )}
      </div>

      {/* View switcher + export */}
      <div className="flex items-center justify-between gap-2 border-b border-[#E4DDE4] print:hidden">
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
          <ViewTab active={view === "portfolio"} onClick={() => setView("portfolio")} label="Portfolio" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          } />
        </div>
        <button onClick={() => window.print()} className="m-btn-ghost mb-1 shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          <span className="hidden sm:inline">Export PDF</span>
          <span className="sm:hidden">PDF</span>
        </button>
      </div>

      {view === "table" && <TableView rows={filtered} users={users} canEdit={canEdit} run={run} showLocation={multiLoc} />}
      {view === "kanban" && <KanbanView rows={filtered} canEdit={canEdit} run={run} showLocation={multiLoc} />}
      {view === "timeline" && <TimelineView rows={filtered} />}
      {view === "portfolio" && <PortfolioView rows={filtered} />}
    </div>
  );
}

function FilterSelect({ value, onChange, label, options }: {
  value: string; onChange: (v: string) => void; label: string; options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-[#440E48] ${value ? "border-[#440E48] text-[#140516] font-medium" : "border-[#E4DDE4] text-[#726973]"}`}
    >
      <option value="">{label}: All</option>
      {options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  );
}

/* ── Main Table: one section per status group ── */
function TableView({
  rows,
  users,
  canEdit,
  run,
  showLocation,
}: {
  rows: ProjectRow[];
  users: UserOpt[];
  canEdit: boolean;
  run: (fn: Action) => void;
  showLocation: boolean;
}) {
  return (
    <div className="space-y-5">
      {PROJECT_STATUS_ORDER.map((status) => {
        const group = rows.filter((r) => r.status === status);
        if (group.length === 0 && status === "CANCELLED") return null;
        return (
          <Group key={status} status={status} rows={group} users={users} canEdit={canEdit} run={run} showLocation={showLocation} />
        );
      })}
      {rows.length === 0 && (
        <div className="m-card p-8 text-center text-[#726973]">
          No projects match. {canEdit ? "Adjust filters or add one in a group above." : "Ask a manager to create one."}
        </div>
      )}
    </div>
  );
}

function Group({
  status,
  rows,
  users,
  canEdit,
  run,
  showLocation,
}: {
  status: ProjectStatus;
  rows: ProjectRow[];
  users: UserOpt[];
  canEdit: boolean;
  run: (fn: Action) => void;
  showLocation: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [newName, setNewName] = useState("");
  const color = PROJECT_STATUS_HEX[status];
  const taskTotal = rows.reduce((s, r) => s + r.taskTotal, 0);
  const taskDone = rows.reduce((s, r) => s + r.taskDone, 0);
  const COLSPAN = canEdit ? 9 : 8;

  return (
    <section className="m-card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[#eee] px-4 py-3" style={{ borderLeft: `5px solid ${color}` }}>
        <button onClick={() => setOpen((o) => !o)} className="text-[#726973]" aria-label="Toggle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <h2 className="text-base font-bold" style={{ color }}>{PROJECT_STATUS_LABEL[status]}</h2>
        <span className="rounded-full bg-[#f3eef3] px-2 py-0.5 text-xs font-semibold text-[#726973]">{rows.length}</span>
        <span className="ml-auto text-xs font-bold text-[#726973]">{taskDone}/{taskTotal} tasks done</span>
      </div>

      {open && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead className="border-b border-[#eee] bg-[#faf8fa] text-left text-xs font-semibold uppercase tracking-wider text-[#726973]">
                <tr>
                  <th className="px-4 py-2.5">Project</th>
                  <th className="px-4 py-2.5 w-36">Client</th>
                  <th className="px-4 py-2.5 w-44">Owner</th>
                  <th className="px-4 py-2.5 w-40">Status</th>
                  <th className="px-4 py-2.5 w-28">Priority</th>
                  <th className="px-4 py-2.5 w-44">Timeline</th>
                  <th className="px-4 py-2.5 w-20">Files</th>
                  <th className="px-4 py-2.5 w-32">Progress</th>
                  {canEdit && <th className="px-2 py-2.5 w-8" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3eef3]">
                {rows.map((p) => (
                  <Row key={p.id} p={p} color={color} users={users} canEdit={canEdit} run={run} colSpan={COLSPAN} showLocation={showLocation} />
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={COLSPAN} className="px-4 py-4 text-sm text-[#A19BA2]">No projects here.</td></tr>
                )}
                {canEdit && (
                  <tr className="print:hidden">
                    <td colSpan={COLSPAN} className="px-4 py-2">
                      <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newName.trim()) {
                            run(() => quickAddProject(newName, status));
                            setNewName("");
                          }
                        }}
                        placeholder="+ Add project and press Enter"
                        className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-[#140516] outline-none placeholder:text-[#A19BA2] hover:border-[#E4DDE4] focus:border-[#440E48]"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-[#f3eef3] sm:hidden">
            {rows.map((p) => (
              <ProjectCard key={p.id} p={p} color={color} users={users} canEdit={canEdit} run={run} showLocation={showLocation} />
            ))}
            {rows.length === 0 && <p className="px-4 py-4 text-sm text-[#A19BA2]">No projects here.</p>}
            {canEdit && (
              <div className="px-4 py-2.5 print:hidden">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newName.trim()) {
                      run(() => quickAddProject(newName, status));
                      setNewName("");
                    }
                  }}
                  placeholder="+ Add project and press Enter"
                  className="w-full rounded-md border border-[#E4DDE4] bg-white px-3 py-2 text-sm text-[#140516] outline-none placeholder:text-[#A19BA2] focus:border-[#440E48]"
                />
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Row({
  p,
  color,
  users,
  canEdit,
  run,
  colSpan,
  showLocation,
}: {
  p: ProjectRow;
  color: string;
  users: UserOpt[];
  canEdit: boolean;
  run: (fn: Action) => void;
  colSpan: number;
  showLocation: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr className="hover:bg-[#faf8fa]">
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded((e) => !e)}
              className="shrink-0 text-[#A19BA2] hover:text-[#440E48]"
              title={`${p.taskTotal} subitems`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform .15s" }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <span className="h-7 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <NameCell p={p} users={users} canEdit={canEdit} run={run} />
            {showLocation && p.locationName && (
              <span className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f0ebf0] px-1.5 py-0.5 text-[10px] font-semibold text-[#726973]" title="Location">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                {p.locationName}
              </span>
            )}
            {p.taskTotal > 0 && (
              <span className="ml-1 shrink-0 rounded-full bg-[#f3eef3] px-1.5 py-0.5 text-[10px] font-semibold text-[#726973]">{p.taskTotal}</span>
            )}
          </div>
        </td>
        <td className="px-4 py-2.5"><ClientCell p={p} canEdit={canEdit} run={run} /></td>
        <td className="px-4 py-2.5"><OwnerCell p={p} users={users} canEdit={canEdit} run={run} /></td>
        <td className="px-4 py-2.5"><StatusCell p={p} canEdit={canEdit} run={run} /></td>
        <td className="px-4 py-2.5"><PriorityCell p={p} canEdit={canEdit} run={run} /></td>
        <td className="px-4 py-2.5"><TimelineCell p={p} canEdit={canEdit} run={run} /></td>
        <td className="px-4 py-2.5"><FilesCell p={p} users={users} canEdit={canEdit} run={run} /></td>
        <td className="px-4 py-2.5"><ProgressCell p={p} /></td>
        {canEdit && (
          <td className="px-2 py-2.5">
            <button
              onClick={() => { if (confirm(`Delete project "${p.name}"? Its tasks are kept but unlinked.`)) run(() => deleteProject(p.id)); }}
              className="text-[#A19BA2] hover:text-[#e2445c]"
              title="Delete project"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </td>
        )}
      </tr>
      {expanded && (
        <tr>
          <td colSpan={colSpan} className="bg-[#faf8fa] px-4 py-3">
            <Subitems p={p} canEdit={canEdit} run={run} />
          </td>
        </tr>
      )}
    </>
  );
}

/* ── Subitems (project's tasks) ── */
function Subitems({ p, canEdit, run }: { p: ProjectRow; canEdit: boolean; run: (fn: Action) => void }) {
  const [title, setTitle] = useState("");
  return (
    <div className="ml-6 border-l-2 border-[#E4DDE4] pl-4">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">Subitems · tasks</div>
      <div className="space-y-1.5">
        {p.subitems.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-md bg-white px-2.5 py-1.5 shadow-sm">
            <span className="flex-1 min-w-[140px] text-sm text-[#140516]">{t.title}</span>
            <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: PRIORITY_HEX[t.priority] }}>
              {PRIORITY_LABEL[t.priority]}
            </span>
            <span className={`text-xs font-medium ${t.overdue ? "text-[#e2445c]" : "text-[#A19BA2]"}`}>
              {t.dueAt ? t.dueAt.slice(5, 10) : "—"}
            </span>
            {t.assigneeName && (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#440E48] text-[9px] font-bold text-white" title={t.assigneeName}>
                {initials(t.assigneeName)}
              </span>
            )}
            {canEdit ? (
              <select
                value={t.overdue ? "OVERDUE" : t.status}
                onChange={(e) => run(() => changeTaskStatus(t.id, e.target.value as TaskStatus))}
                className="cursor-pointer rounded-md border-none px-2 py-1 text-xs font-semibold text-white outline-none"
                style={{ backgroundColor: TASK_STATUS_HEX[t.overdue ? "OVERDUE" : t.status] }}
              >
                {TASK_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} className="bg-white text-[#140516]">{STATUS_LABEL[s]}</option>
                ))}
              </select>
            ) : (
              <span className="inline-flex rounded-md px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: TASK_STATUS_HEX[t.overdue ? "OVERDUE" : t.status] }}>
                {STATUS_LABEL[t.overdue ? "OVERDUE" : t.status]}
              </span>
            )}
          </div>
        ))}
        {p.subitems.length === 0 && <p className="text-xs text-[#A19BA2]">No subitems yet.</p>}
      </div>
      {canEdit && (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim()) { run(() => addProjectTask(p.id, title)); setTitle(""); }
          }}
          placeholder="+ Add subitem and press Enter"
          className="mt-2 w-full max-w-md rounded-md border border-[#E4DDE4] bg-white px-2.5 py-1.5 text-sm text-[#140516] outline-none placeholder:text-[#A19BA2] focus:border-[#440E48]"
        />
      )}
    </div>
  );
}

/* ── Files cell → opens the project editor (files section) ── */
function FilesCell({ p, users, canEdit, run }: { p: ProjectRow; users: UserOpt[]; canEdit: boolean; run: (fn: Action) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${p.files.length ? "bg-[#f3eef3] text-[#440E48]" : "text-[#A19BA2] hover:bg-[#f3eef3]"}`}
        title="Files"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        {p.files.length || "—"}
      </button>
      {open && <ProjectEditModal p={p} users={users} canEdit={canEdit} run={run} onClose={() => setOpen(false)} />}
    </>
  );
}

/* ── Editable cells ── */
function NameCell({ p, users, canEdit, run }: { p: ProjectRow; users: UserOpt[]; canEdit: boolean; run: (fn: Action) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => canEdit && setOpen(true)}
        disabled={!canEdit}
        className={`text-left font-semibold text-[#140516] ${canEdit ? "hover:text-[#440E48] hover:underline" : "cursor-default"}`}
        title={canEdit ? "Open project" : undefined}
      >
        {p.name}
      </button>
      {open && <ProjectEditModal p={p} users={users} canEdit={canEdit} run={run} onClose={() => setOpen(false)} />}
    </>
  );
}

/* ── Project editor modal: all fields in one vertical form (no side-scroll) ── */
function ProjectEditModal({
  p, users, canEdit, run, onClose,
}: {
  p: ProjectRow; users: UserOpt[]; canEdit: boolean; run: (fn: Action) => void; onClose: () => void;
}) {
  const [name, setName] = useState(p.name);
  const [client, setClient] = useState(p.client ?? "");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const field = "w-full rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm text-[#140516] outline-none focus:border-[#440E48]";
  const toDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
  const ro = !canEdit;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-[#E4DDE4] bg-white px-5 py-3.5">
          <h2 className="text-base font-bold text-[#140516]">Project details</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-[#726973] hover:bg-[#F0EBF0]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="space-y-4 p-5">
          <Labeled label="Project name">
            <input className={field} value={name} disabled={ro} onChange={(e) => setName(e.target.value)}
              onBlur={() => { if (name.trim() && name !== p.name) run(() => renameProject(p.id, name)); }} />
          </Labeled>

          <Labeled label="Client">
            <input className={field} value={client} disabled={ro} placeholder="—" onChange={(e) => setClient(e.target.value)}
              onBlur={() => { if ((client.trim() || null) !== p.client) run(() => setProjectClient(p.id, client)); }} />
          </Labeled>

          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Owner">
              <select className={field} value={p.ownerId ?? ""} disabled={ro} onChange={(e) => run(() => assignProjectOwner(p.id, e.target.value))}>
                <option value="">— Unassigned —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Labeled>
            <Labeled label="Priority">
              <select className={field} value={p.priority} disabled={ro} onChange={(e) => run(() => setProjectPriority(p.id, e.target.value as Priority))}>
                {PRIORITY_OPTIONS.map((pr) => <option key={pr} value={pr}>{PRIORITY_LABEL[pr]}</option>)}
              </select>
            </Labeled>
          </div>

          <Labeled label="Status">
            <select className={field} value={p.status} disabled={ro} onChange={(e) => run(() => changeProjectStatus(p.id, e.target.value as ProjectStatus))}>
              {PROJECT_STATUS_ORDER.map((s) => <option key={s} value={s}>{PROJECT_STATUS_LABEL[s]}</option>)}
            </select>
          </Labeled>

          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Start date">
              <input type="date" className={field} defaultValue={toDate(p.startAt)} disabled={ro}
                onChange={(e) => run(() => setProjectTimeline(p.id, e.target.value ? new Date(`${e.target.value}T09:00:00Z`).toISOString() : null, p.dueAt))} />
            </Labeled>
            <Labeled label="Due date">
              <input type="date" className={field} defaultValue={toDate(p.dueAt)} disabled={ro}
                onChange={(e) => run(() => setProjectTimeline(p.id, p.startAt, e.target.value ? new Date(`${e.target.value}T17:00:00Z`).toISOString() : null))} />
            </Labeled>
          </div>

          {/* Progress (read-only) */}
          <Labeled label={`Progress · ${p.taskDone}/${p.taskTotal} tasks`}>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#eee]">
              <div className="h-full rounded-full" style={{ width: `${p.progress}%`, backgroundColor: p.progress === 100 ? "#1DBA87" : "#440E48" }} />
            </div>
          </Labeled>

          {/* Files */}
          <div className="border-t border-[#F0EBF0] pt-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[#726973]">Files</div>
            {p.files.length > 0 && (
              <ul className="mb-3 space-y-1.5">
                {p.files.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 rounded-lg border border-[#E4DDE4] px-3 py-2 text-sm">
                    <a href={f.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-[#440E48] hover:underline" title={f.url}>
                      {f.name || f.url.replace(/^https?:\/\//, "")}
                    </a>
                    {canEdit && (
                      <button onClick={() => run(() => removeProjectFile(f.id))} className="shrink-0 text-[#A19BA2] hover:text-[#e2445c]" title="Remove">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canEdit && (
              <div className="space-y-2">
                <FileDropzone value={[]} onChange={() => {}} kind="file" folder="projects"
                  onUploaded={(fileUrl, fileName) => run(() => addProjectFile(p.id, fileUrl, fileName))} />
                <div className="text-center text-[10px] text-[#A19BA2]">or paste a link</div>
                <div className="flex gap-2">
                  <input value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="Label" className={`${field} w-28`} />
                  <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className={`${field} flex-1`}
                    onKeyDown={(e) => { if (e.key === "Enter" && linkUrl.trim()) { run(() => addProjectFile(p.id, linkUrl, linkName)); setLinkUrl(""); setLinkName(""); } }} />
                  <button onClick={() => { if (linkUrl.trim()) { run(() => addProjectFile(p.id, linkUrl, linkName)); setLinkUrl(""); setLinkName(""); } }}
                    className="shrink-0 rounded-lg bg-[#440E48] px-3 text-xs font-semibold text-white">Add</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-[#E4DDE4] bg-white px-5 py-3">
          <button onClick={onClose} className="m-btn w-full justify-center">Done</button>
        </div>
      </div>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[#726973]">{label}</span>
      {children}
    </label>
  );
}

function ClientCell({ p, canEdit, run }: { p: ProjectRow; canEdit: boolean; run: (fn: Action) => void }) {
  if (!canEdit) return <span className="text-[#726973]">{p.client ?? "—"}</span>;
  return (
    <input
      defaultValue={p.client ?? ""}
      onBlur={(e) => { if ((e.target.value.trim() || null) !== p.client) run(() => setProjectClient(p.id, e.target.value)); }}
      placeholder="—"
      className="w-full rounded-md border border-[#E4DDE4] bg-white px-2 py-1.5 text-sm text-[#140516] outline-none hover:border-[#A19BA2] focus:border-[#440E48]"
    />
  );
}

function OwnerCell({ p, users, canEdit, run }: { p: ProjectRow; users: UserOpt[]; canEdit: boolean; run: (fn: Action) => void }) {
  if (!canEdit)
    return (
      <span className="inline-flex items-center gap-2 text-[#726973]">
        {p.ownerName ? (
          <>
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[#440E48] text-[10px] font-bold text-white">{initials(p.ownerName)}</span>
            {p.ownerName}
          </>
        ) : "—"}
      </span>
    );
  return (
    <select
      value={p.ownerId ?? ""}
      onChange={(e) => run(() => assignProjectOwner(p.id, e.target.value))}
      className="w-full rounded-md border border-[#E4DDE4] bg-white px-2 py-1.5 text-sm text-[#140516] outline-none hover:border-[#A19BA2] focus:border-[#440E48]"
    >
      <option value="">— Unassigned —</option>
      {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
    </select>
  );
}

function StatusCell({ p, canEdit, run }: { p: ProjectRow; canEdit: boolean; run: (fn: Action) => void }) {
  if (!canEdit)
    return (
      <span className="inline-flex rounded-md px-2.5 py-1 text-xs font-semibold text-white" style={{ backgroundColor: PROJECT_STATUS_HEX[p.status] }}>
        {PROJECT_STATUS_LABEL[p.status]}
      </span>
    );
  return (
    <select
      value={p.status}
      onChange={(e) => run(() => changeProjectStatus(p.id, e.target.value as ProjectStatus))}
      className="w-full cursor-pointer rounded-md border-none px-2.5 py-1.5 text-sm font-semibold text-white outline-none"
      style={{ backgroundColor: PROJECT_STATUS_HEX[p.status] }}
    >
      {PROJECT_STATUS_ORDER.map((s) => (
        <option key={s} value={s} className="bg-white text-[#140516]">{PROJECT_STATUS_LABEL[s]}</option>
      ))}
    </select>
  );
}

function PriorityCell({ p, canEdit, run }: { p: ProjectRow; canEdit: boolean; run: (fn: Action) => void }) {
  if (!canEdit)
    return (
      <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ backgroundColor: PRIORITY_HEX[p.priority] }}>
        {PRIORITY_LABEL[p.priority]}
      </span>
    );
  return (
    <select
      value={p.priority}
      onChange={(e) => run(() => setProjectPriority(p.id, e.target.value as Priority))}
      className="w-full cursor-pointer rounded-full border-none px-2.5 py-1.5 text-xs font-semibold text-white outline-none"
      style={{ backgroundColor: PRIORITY_HEX[p.priority] }}
    >
      {PRIORITY_OPTIONS.map((pr) => (
        <option key={pr} value={pr} className="bg-white text-[#140516]">{PRIORITY_LABEL[pr]}</option>
      ))}
    </select>
  );
}

function TimelineCell({ p, canEdit, run }: { p: ProjectRow; canEdit: boolean; run: (fn: Action) => void }) {
  const [editing, setEditing] = useState(false);
  if (!canEdit || !editing)
    return (
      <span
        className={`${p.overdue ? "font-medium text-[#e2445c]" : "text-[#726973]"} ${canEdit ? "cursor-pointer hover:underline" : ""}`}
        onClick={() => canEdit && setEditing(true)}
        title={canEdit ? "Click to edit timeline" : undefined}
      >
        {fmtRange(p.startAt, p.dueAt)}
      </span>
    );
  const toInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
  return (
    <div className="flex items-center gap-1">
      <input
        type="date"
        defaultValue={toInput(p.startAt)}
        onChange={(e) =>
          run(() => setProjectTimeline(p.id, e.target.value ? new Date(`${e.target.value}T09:00:00Z`).toISOString() : null, p.dueAt))
        }
        className="w-[7.5rem] rounded-md border border-[#E4DDE4] bg-white px-1.5 py-1 text-xs text-[#140516] outline-none focus:border-[#440E48]"
      />
      <input
        type="date"
        defaultValue={toInput(p.dueAt)}
        onChange={(e) =>
          run(() => setProjectTimeline(p.id, p.startAt, e.target.value ? new Date(`${e.target.value}T17:00:00Z`).toISOString() : null))
        }
        onBlur={() => setEditing(false)}
        className="w-[7.5rem] rounded-md border border-[#E4DDE4] bg-white px-1.5 py-1 text-xs text-[#140516] outline-none focus:border-[#440E48]"
      />
    </div>
  );
}

function ProgressCell({ p }: { p: ProjectRow }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#eee]">
        <div className="h-full rounded-full" style={{ width: `${p.progress}%`, backgroundColor: p.progress === 100 ? "#1DBA87" : "#440E48" }} />
      </div>
      <span className="w-14 shrink-0 text-right text-xs font-bold text-[#726973]">
        {p.taskDone}/{p.taskTotal}
      </span>
    </div>
  );
}

/* Mobile card */
function ProjectCard({
  p,
  color,
  users,
  canEdit,
  run,
  showLocation,
}: {
  p: ProjectRow;
  color: string;
  users: UserOpt[];
  canEdit: boolean;
  run: (fn: Action) => void;
  showLocation: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="space-y-2.5 px-4 py-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 h-5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <div className="flex-1">
          <NameCell p={p} users={users} canEdit={canEdit} run={run} />
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#A19BA2]">
            {p.client && <span>{p.client}</span>}
            {showLocation && p.locationName && <span>· 📍 {p.locationName}</span>}
          </div>
        </div>
        <PriorityCell p={p} canEdit={canEdit} run={run} />
      </div>
      <StatusCell p={p} canEdit={canEdit} run={run} />
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#A19BA2]">Owner</div>
        <OwnerCell p={p} users={users} canEdit={canEdit} run={run} />
      </div>
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#A19BA2]">Timeline</div>
        <TimelineCell p={p} canEdit={canEdit} run={run} />
      </div>
      <ProgressCell p={p} />
      <div className="flex items-center justify-between">
        <FilesCell p={p} users={users} canEdit={canEdit} run={run} />
        <button onClick={() => setExpanded((e) => !e)} className="text-xs font-semibold text-[#440E48]">
          {expanded ? "Hide" : `Subitems (${p.taskTotal})`}
        </button>
      </div>
      {expanded && <Subitems p={p} canEdit={canEdit} run={run} />}
    </div>
  );
}

/* ── Kanban by status ── */
function KanbanView({ rows, canEdit, run, showLocation }: { rows: ProjectRow[]; canEdit: boolean; run: (fn: Action) => void; showLocation: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {PROJECT_STATUS_ORDER.filter((s) => s !== "CANCELLED").map((status) => {
        const items = rows.filter((r) => r.status === status);
        return (
          <div key={status} className="rounded-xl bg-[#f3eef3] p-3">
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PROJECT_STATUS_HEX[status] }} />
              <span className="text-sm font-bold text-[#140516]">{PROJECT_STATUS_LABEL[status]}</span>
              <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#726973]">{items.length}</span>
            </div>
            <div className="space-y-2.5">
              {items.map((p) => (
                <KanbanCard key={p.id} p={p} canEdit={canEdit} run={run} showLocation={showLocation} />
              ))}
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-[#D0CDD0] py-6 text-center text-xs text-[#A19BA2]">
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

function KanbanCard({ p, canEdit, run, showLocation }: { p: ProjectRow; canEdit: boolean; run: (fn: Action) => void; showLocation: boolean }) {
  return (
    <div className="rounded-lg bg-white p-3 shadow-sm" style={{ borderLeft: `4px solid ${p.color}` }}>
      <div className="mb-1 text-sm font-semibold text-[#140516]">{p.name}</div>
      {(p.client || (showLocation && p.locationName)) && (
        <div className="mb-2 text-[11px] text-[#A19BA2]">
          {[p.client, showLocation ? p.locationName : null].filter(Boolean).join(" · ")}
        </div>
      )}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {p.ownerName ? (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[#440E48] text-[10px] font-bold text-white" title={p.ownerName}>{initials(p.ownerName)}</span>
          ) : (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[#eee] text-[10px] text-[#A19BA2]" title="Unassigned">—</span>
          )}
          <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ backgroundColor: PRIORITY_HEX[p.priority] }}>
            {PRIORITY_LABEL[p.priority]}
          </span>
        </div>
        <span className="text-xs font-bold text-[#726973]">{p.taskDone}/{p.taskTotal}</span>
      </div>
      <ProgressCell p={p} />
      {canEdit && (
        <select
          value={p.status}
          onChange={(e) => run(() => changeProjectStatus(p.id, e.target.value as ProjectStatus))}
          className="mt-2.5 w-full cursor-pointer rounded-md border-none px-2 py-1 text-xs font-semibold text-white outline-none"
          style={{ backgroundColor: PROJECT_STATUS_HEX[p.status] }}
        >
          {PROJECT_STATUS_ORDER.map((s) => (
            <option key={s} value={s} className="bg-white text-[#140516]">Move to: {PROJECT_STATUS_LABEL[s]}</option>
          ))}
        </select>
      )}
    </div>
  );
}

/* ── Timeline (Gantt) ── */
const MS_DAY = 86400000;
function TimelineView({ rows }: { rows: ProjectRow[] }) {
  const dated = rows.filter((r) => r.startAt || r.dueAt);
  const { start, end, months } = useMemo(() => {
    if (dated.length === 0) {
      const now = new Date();
      const s = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const e = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 3, 0));
      return { start: s, end: e, months: monthTicks(s, e) };
    }
    let min = Infinity, max = -Infinity;
    for (const r of dated) {
      const s = r.startAt ? Date.parse(r.startAt) : Date.parse(r.dueAt!);
      const e = r.dueAt ? Date.parse(r.dueAt) : Date.parse(r.startAt!);
      min = Math.min(min, s); max = Math.max(max, e);
    }
    // Pad a week on each side and snap to month edges.
    const s = new Date(min - 7 * MS_DAY);
    const e = new Date(max + 7 * MS_DAY);
    const start = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1));
    const end = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth() + 1, 0));
    return { start, end, months: monthTicks(start, end) };
  }, [dated]);

  const span = Math.max(1, (end.getTime() - start.getTime()) / MS_DAY);
  const pct = (ms: number) => ((ms - start.getTime()) / MS_DAY / span) * 100;
  const todayPct = pct(Date.now());

  return (
    <div className="m-card overflow-x-auto p-4">
      <div className="min-w-[760px]">
        {/* Month header */}
        <div className="flex border-b border-[#eee] pb-1">
          <div className="w-52 shrink-0" />
          <div className="relative flex flex-1">
            {months.map((m) => (
              <div key={m.label} className="border-l border-[#f3eef3] text-[10px] font-semibold uppercase tracking-wide text-[#A19BA2]" style={{ width: `${m.widthPct}%`, paddingLeft: 4 }}>
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div>
          {rows.map((r) => {
            const sMs = r.startAt ? Date.parse(r.startAt) : r.dueAt ? Date.parse(r.dueAt) : null;
            const eMs = r.dueAt ? Date.parse(r.dueAt) : r.startAt ? Date.parse(r.startAt) : null;
            const leftPct = sMs != null ? Math.max(0, pct(sMs)) : null;
            const rightPct = eMs != null ? Math.min(100, pct(eMs)) : null;
            const widthPct = leftPct != null && rightPct != null ? Math.max(1.5, rightPct - leftPct) : null;
            return (
              <div key={r.id} className="flex items-center border-b border-[#f7f3f7] py-1.5 last:border-0">
                <div className="flex w-52 shrink-0 items-center gap-2 pr-3">
                  <span className="h-4 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
                  <span className="truncate text-xs font-medium text-[#140516]" title={r.name}>{r.name}</span>
                </div>
                <div className="relative h-6 flex-1 rounded bg-[#faf8fa]">
                  {/* Today marker (inside track, aligned to scale) */}
                  {todayPct >= 0 && todayPct <= 100 && (
                    <div className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-[#e2445c]/60" style={{ left: `${todayPct}%` }} />
                  )}
                  {widthPct != null ? (
                    <div
                      className="absolute top-1/2 flex -translate-y-1/2 items-center overflow-hidden rounded-md px-2 text-[10px] font-semibold text-white shadow-sm"
                      style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: 24, height: 18, backgroundColor: r.overdue ? "#e2445c" : r.color }}
                      title={`${r.name}: ${fmtRange(r.startAt, r.dueAt)}`}
                    >
                      <span className="truncate">{r.progress}%</span>
                    </div>
                  ) : (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[#A19BA2]">No dates</span>
                  )}
                </div>
              </div>
            );
          })}
          {rows.length === 0 && <p className="py-6 text-center text-sm text-[#A19BA2]">No projects to plot.</p>}
        </div>
      </div>
    </div>
  );
}

function monthTicks(start: Date, end: Date): { label: string; widthPct: number }[] {
  const total = Math.max(1, (end.getTime() - start.getTime()) / MS_DAY);
  const ticks: { label: string; widthPct: number }[] = [];
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cur <= end) {
    const next = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1));
    const segStart = Math.max(cur.getTime(), start.getTime());
    const segEnd = Math.min(next.getTime(), end.getTime());
    const widthPct = ((segEnd - segStart) / MS_DAY / total) * 100;
    ticks.push({ label: cur.toLocaleString("en-US", { month: "short", year: "2-digit" }), widthPct });
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return ticks;
}

/* ── Portfolio (charts) ── */
function PortfolioView({ rows }: { rows: ProjectRow[] }) {
  const statusData = useMemo(
    () =>
      PROJECT_STATUS_ORDER.map((s) => ({
        label: PROJECT_STATUS_LABEL[s],
        value: rows.filter((r) => r.status === s).length,
        color: PROJECT_STATUS_HEX[s],
      })).filter((d) => d.value > 0),
    [rows],
  );
  const byProgress = useMemo(
    () => [...rows].filter((r) => r.taskTotal > 0).sort((a, b) => b.progress - a.progress).slice(0, 6),
    [rows],
  );
  const shownTotal = rows.length;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="m-card p-5">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#726973]">Projects by status</h3>
        <div className="flex items-center gap-6">
          <Donut data={statusData} total={shownTotal} />
          <ul className="space-y-1.5 text-sm">
            {statusData.map((s) => (
              <li key={s.label} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                <span className="text-[#140516]">{s.label}</span>
                <span className="ml-6 font-bold text-[#726973]">{s.value}</span>
              </li>
            ))}
            {statusData.length === 0 && <li className="text-[#A19BA2]">No projects.</li>}
          </ul>
        </div>
      </div>

      <div className="m-card p-5">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#726973]">Task progress by project</h3>
        <div className="space-y-3">
          {byProgress.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <span className="w-40 truncate text-sm font-medium text-[#140516]">{p.name}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#eee]">
                <div className="h-full rounded-full" style={{ width: `${p.progress}%`, backgroundColor: p.progress === 100 ? "#1DBA87" : p.color }} />
              </div>
              <span className="w-16 text-right text-sm font-bold text-[#726973]">{p.taskDone}/{p.taskTotal}</span>
            </div>
          ))}
          {byProgress.length === 0 && <p className="text-sm text-[#A19BA2]">No tasks in projects yet.</p>}
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
      <circle cx="70" cy="70" r={r} fill="none" stroke="#eee" strokeWidth="16" />
      {total > 0 &&
        data.map((d, i) => {
          const len = (d.value / total) * c;
          const el = (
            <circle key={i} cx="70" cy="70" r={r} fill="none" stroke={d.color} strokeWidth="16"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />
          );
          offset += len;
          return el;
        })}
      <text x="70" y="66" textAnchor="middle" style={{ fontSize: 26, fontWeight: 800, fill: "#140516" }}>{total}</text>
      <text x="70" y="88" textAnchor="middle" style={{ fontSize: 11, fill: "#A19BA2" }}>projects</text>
    </svg>
  );
}

function ViewTab({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
        active ? "border-[#440E48] text-[#440E48]" : "border-transparent text-[#726973] hover:text-[#140516]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Kpi({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="m-card relative overflow-hidden p-4">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
      <div className="text-2xl font-extrabold lg:text-3xl" style={{ color }}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-[#726973]">{label}</div>
    </div>
  );
}
