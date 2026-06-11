"use client";

import { useState, useTransition } from "react";
import { TaskStatus } from "@prisma/client";
import { changeTaskStatus } from "@/lib/tasks";
import { PhotoUploader } from "./PhotoUploader";

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
  const [photos, setPhotos] = useState<string[]>([]);

  const actions = NEXT_ACTIONS[status].filter((a) => a.to !== "VERIFIED" || canVerify);

  function run(to: TaskStatus) {
    setError(null);
    const proof = to === "DONE" ? photos : undefined;
    startTransition(async () => {
      const res = await changeTaskStatus(taskId, to, proof);
      if (!res.ok) setError(res.error);
      else setPhotos([]);
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
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            📷 Photo proof required to mark this done
          </label>
          <PhotoUploader value={photos} onChange={setPhotos} disabled={pending} />
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
