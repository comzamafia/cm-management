"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Priority } from "@prisma/client";
import { editTask } from "@/lib/tasks";
import { PRIORITY_LABEL, ROLE_LABEL } from "@/lib/labels";

type TaskEdit = {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  assigneeId: string | null;
  categoryId: string | null;
  department: string | null;
  dueAt: string | null;
  proofRequired: boolean;
};

type UserOpt = { id: string; name: string; role: string };
type CategoryOpt = { id: string; name: string; color: string };

const field =
  "w-full rounded-xl border border-[#E4DDE4] bg-white px-3 py-2 text-sm text-[#140516] placeholder-[#A19BA2] outline-none transition focus:border-[#440E48] focus:ring-2 focus:ring-[#440E48]/10";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wider text-[#726973]";

export function TaskEditModal({
  task,
  users,
  categories,
}: {
  task: TaskEdit;
  users: UserOpt[];
  categories: CategoryOpt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? "");
  const [categoryId, setCategoryId] = useState(task.categoryId ?? "");
  const [department, setDepartment] = useState(task.department ?? "");
  const [dueAt, setDueAt] = useState(task.dueAt ?? "");
  const [proofRequired, setProofRequired] = useState(task.proofRequired);

  function openModal() {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setAssigneeId(task.assigneeId ?? "");
    setCategoryId(task.categoryId ?? "");
    setDepartment(task.department ?? "");
    setDueAt(task.dueAt ?? "");
    setProofRequired(task.proofRequired);
    setError(null);
    setOpen(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await editTask({
        id: task.id,
        title,
        description,
        priority,
        assigneeId: assigneeId || undefined,
        categoryId: categoryId || undefined,
        department,
        dueAt: dueAt || null,
        proofRequired,
      });
      if (!res.ok) { setError(res.error); return; }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4DDE4] bg-white px-4 py-2 text-sm font-semibold text-[#440E48] transition hover:bg-[#F0EBF0]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Edit Task
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="h-[2px] bg-gradient-to-r from-[#9F4000] via-[#F4A626] to-[#9F4000]" />
            <div className="max-h-[85vh] overflow-y-auto p-6">
              <h3 className="mb-5 text-base font-bold text-[#140516]">Edit Task</h3>

              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Title *</label>
                  <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
                </div>

                <div>
                  <label className={labelCls}>Description</label>
                  <textarea className={field} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add details…" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Priority</label>
                    <select className={field} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                      {Object.entries(PRIORITY_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Department</label>
                    <input className={field} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Kitchen" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Assignee</label>
                    <select className={field} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                      <option value="">— Unassigned —</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({ROLE_LABEL[u.role as keyof typeof ROLE_LABEL] ?? u.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Category</label>
                    <select className={field} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                      <option value="">— No category —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Due date / time</label>
                  <input type="datetime-local" className={field} value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#433745] select-none">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={proofRequired}
                    onChange={(e) => setProofRequired(e.target.checked)}
                  />
                  Require photo proof before completion
                </label>
              </div>

              {error && (
                <p className="mt-4 rounded-xl bg-[#FFF0EE] px-4 py-2.5 text-sm font-medium text-[#943B13]">{error}</p>
              )}

              <div className="mt-5 flex justify-end gap-3">
                <button onClick={() => setOpen(false)} className="m-btn-ghost">Cancel</button>
                <button onClick={save} disabled={pending || !title.trim()} className="m-btn disabled:opacity-60">
                  {pending ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
