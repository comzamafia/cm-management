"use client";

import { useState, useTransition } from "react";
import { TaskStatus } from "@prisma/client";
import { changeTaskStatus } from "@/lib/tasks";

// Buttons offered per current (derived) status, mirroring server-side TRANSITIONS.
const NEXT_ACTIONS: Record<TaskStatus, { to: TaskStatus; label: string }[]> = {
  PENDING: [
    { to: "IN_PROGRESS", label: "Start" },
    { to: "DONE", label: "Mark Done" },
  ],
  IN_PROGRESS: [{ to: "DONE", label: "Mark Done" }],
  OVERDUE: [
    { to: "IN_PROGRESS", label: "Start" },
    { to: "DONE", label: "Mark Done" },
  ],
  DONE: [
    { to: "VERIFIED", label: "Verify" },
    { to: "IN_PROGRESS", label: "Reopen" },
  ],
  VERIFIED: [],
};

export function TaskActions({
  taskId,
  status,
  proofRequired,
  canVerify,
}: {
  taskId: string;
  status: TaskStatus;
  proofRequired: boolean;
  canVerify: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [photoInput, setPhotoInput] = useState("");

  const actions = NEXT_ACTIONS[status].filter((a) => a.to !== "VERIFIED" || canVerify);

  function run(to: TaskStatus) {
    setError(null);
    const photos =
      to === "DONE"
        ? photoInput.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
        : undefined;
    startTransition(async () => {
      const res = await changeTaskStatus(taskId, to, photos);
      if (!res.ok) setError(res.error);
      else setPhotoInput("");
    });
  }

  if (actions.length === 0) {
    return <p className="text-sm text-slate-500">No further actions — this task is verified.</p>;
  }

  const showProof =
    proofRequired && (status === "PENDING" || status === "IN_PROGRESS" || status === "OVERDUE");

  return (
    <div className="space-y-3">
      {showProof && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Photo proof required — paste image URL(s), one per line
          </label>
          <textarea
            value={photoInput}
            onChange={(e) => setPhotoInput(e.target.value)}
            rows={2}
            placeholder="https://…/proof.jpg"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.to}
            disabled={pending}
            onClick={() => run(a.to)}
            className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${
              a.to === "DONE" || a.to === "VERIFIED"
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "bg-slate-200 text-slate-800 hover:bg-slate-300"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
