"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Priority, TaskType } from "@prisma/client";
import { createTask } from "@/lib/tasks";
import { PRIORITY_LABEL, ROLE_LABEL, TYPE_LABEL } from "@/lib/labels";

type LocationOpt = { id: string; name: string };
type UserOpt = { id: string; name: string; role: keyof typeof ROLE_LABEL; locationId: string | null };
type CategoryOpt = { id: string; name: string; color: string };

const field =
  "w-full rounded-xl border border-[#E4DDE4] bg-white px-3 py-2 text-sm text-[#140516] placeholder-[#A19BA2] outline-none transition focus:border-[#440E48] focus:ring-2 focus:ring-[#440E48]/10";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#726973]";

export function NewTaskForm({
  locations,
  users,
  categories,
}: {
  locations: LocationOpt[];
  users: UserOpt[];
  categories: CategoryOpt[];
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
  const [categoryId, setCategoryId] = useState("");
  const [department, setDepartment] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [proofRequired, setProofRequired] = useState(false);

  const assignees = users.filter(
    (u) => !locationId || u.locationId === locationId || u.locationId === null,
  );

  function submit() {
    setError(null);
    if (!title.trim()) { setError("Title is required"); return; }
    startTransition(async () => {
      const res = await createTask({
        title,
        description,
        type,
        priority,
        locationId,
        assigneeId: assigneeId || undefined,
        categoryId: categoryId || undefined,
        department,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        proofRequired,
      });
      if (!res.ok) setError(res.error);
      else router.push("/tasks");
    });
  }

  return (
    <div className="m-card space-y-5 p-6">
      <div>
        <label className={labelCls}>Title *</label>
        <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" />
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea className={field} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add details…" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Type</label>
          <select className={field} value={type} onChange={(e) => setType(e.target.value as TaskType)}>
            {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Priority</label>
          <select className={field} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {Object.entries(PRIORITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Branch *</label>
          <select
            className={field}
            value={locationId}
            onChange={(e) => { setLocationId(e.target.value); setAssigneeId(""); }}
          >
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
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
          <label className={labelCls}>Category</label>
          <select className={field} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— No category —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {categoryId && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: categories.find((c) => c.id === categoryId)?.color ?? "#ccc" }}
              />
              <span className="text-xs text-[#726973]">
                {categories.find((c) => c.id === categoryId)?.name}
              </span>
            </div>
          )}
        </div>
        <div>
          <label className={labelCls}>Department</label>
          <input className={field} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Kitchen" />
        </div>
      </div>

      <div>
        <label className={labelCls}>Due date / time</label>
        <input type="datetime-local" className={field} value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-[#433745] select-none">
        <input type="checkbox" className="rounded" checked={proofRequired} onChange={(e) => setProofRequired(e.target.checked)} />
        Require photo proof before completion
      </label>

      {error && (
        <p className="rounded-xl bg-[#FFF0EE] px-4 py-2.5 text-sm font-medium text-[#943B13]">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={submit}
          disabled={pending}
          className="m-btn disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create Task"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="m-btn-ghost"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
