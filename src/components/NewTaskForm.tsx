"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Priority, TaskType } from "@prisma/client";
import { createTask } from "@/lib/tasks";
import { PRIORITY_LABEL, ROLE_LABEL, TYPE_LABEL } from "@/lib/labels";

type LocationOpt = { id: string; name: string };
type UserOpt = { id: string; name: string; role: keyof typeof ROLE_LABEL; locationId: string | null };

export function NewTaskForm({
  locations,
  users,
}: {
  locations: LocationOpt[];
  users: UserOpt[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskType>("ONE_OFF");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [assigneeId, setAssigneeId] = useState("");
  const [department, setDepartment] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [proofRequired, setProofRequired] = useState(false);

  // Assignees belonging to the chosen location (plus unassigned option).
  const assignees = users.filter((u) => !locationId || u.locationId === locationId || u.locationId === null);

  function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    startTransition(async () => {
      const res = await createTask({
        title,
        description,
        type,
        priority,
        locationId,
        assigneeId: assigneeId || undefined,
        department,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        proofRequired,
      });
      if (!res.ok) setError(res.error);
      else router.push("/tasks");
    });
  }

  const field = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
  const labelCls = "mb-1 block text-xs font-medium text-slate-600";

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      <div>
        <label className={labelCls}>Title *</label>
        <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea className={field} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Type</label>
          <select className={field} value={type} onChange={(e) => setType(e.target.value as TaskType)}>
            {Object.entries(TYPE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Priority</label>
          <select className={field} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {Object.entries(PRIORITY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Location *</label>
          <select
            className={field}
            value={locationId}
            onChange={(e) => {
              setLocationId(e.target.value);
              setAssigneeId("");
            }}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Assignee</label>
          <select className={field} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">— Unassigned —</option>
            {assignees.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({ROLE_LABEL[u.role]})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Department</label>
          <input className={field} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Kitchen" />
        </div>
        <div>
          <label className={labelCls}>Due date/time</label>
          <input type="datetime-local" className={field} value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={proofRequired} onChange={(e) => setProofRequired(e.target.checked)} />
        Require photo proof before completion
      </label>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create Task"}
        </button>
      </div>
    </div>
  );
}
