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

export function BoardView({
  groups,
  users,
  totals,
  canEdit,
}: {
  groups: BoardGroup[];
  users: UserOpt[];
  totals: Totals;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

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

      {/* Groups */}
      <div className="space-y-5">
        {groups.map((g) => (
          <Group key={g.id} group={g} users={users} canEdit={canEdit} run={run} />
        ))}
      </div>

      {canEdit && <AddCategory run={run} />}
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
        <div className="overflow-x-auto">
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
                <tr>
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
      )}
    </section>
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
  const displayStatus: TaskStatus = task.overdue ? "OVERDUE" : task.status;
  return (
    <tr className="hover:bg-[#f9fafc]">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="h-7 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-medium text-[#323338]">{task.title}</span>
        </div>
      </td>

      {/* Owner */}
      <td className="px-4 py-2.5">
        {canEdit ? (
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
        ) : (
          <span className="text-[#676879]">{task.assigneeName ?? "—"}</span>
        )}
      </td>

      {/* Due date */}
      <td className="px-4 py-2.5">
        {canEdit ? (
          <input
            type="date"
            value={task.dueAt ? task.dueAt.slice(0, 10) : ""}
            onChange={(e) =>
              run(() => setTaskDue(task.id, e.target.value ? new Date(`${e.target.value}T17:00:00Z`).toISOString() : null))
            }
            className={`w-full rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:border-[#0073ea] ${task.overdue ? "border-[#e2445c] text-[#e2445c]" : "border-[#e6e9ef] text-[#323338]"}`}
          />
        ) : (
          <span className={task.overdue ? "font-medium text-[#e2445c]" : "text-[#676879]"}>
            {task.dueAt ? task.dueAt.slice(0, 10) : "—"}
          </span>
        )}
      </td>

      {/* Priority */}
      <td className="px-4 py-2.5">
        <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ backgroundColor: PRIORITY_HEX[task.priority] }}>
          {PRIORITY_LABEL[task.priority]}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-2.5">
        {canEdit ? (
          <select
            value={task.status}
            onChange={(e) => run(() => changeTaskStatus(task.id, e.target.value as TaskStatus))}
            className="w-full cursor-pointer rounded-md border-none px-2.5 py-1.5 text-sm font-semibold text-white outline-none"
            style={{ backgroundColor: STATUS_HEX[displayStatus] }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="bg-white text-[#323338]">{STATUS_LABEL[s]}</option>
            ))}
          </select>
        ) : (
          <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ backgroundColor: STATUS_HEX[displayStatus] }}>
            {STATUS_LABEL[displayStatus]}
          </span>
        )}
      </td>
    </tr>
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
