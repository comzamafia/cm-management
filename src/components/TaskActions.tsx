"use client";

import { useState, useTransition } from "react";
import { TaskStatus } from "@prisma/client";
import { changeTaskStatus } from "@/lib/tasks";
import { PhotoUploader } from "./PhotoUploader";

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
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-[#1DBA87]">
        <span className="inline-block h-2 w-2 rounded-full bg-[#1DBA87]" />
        This task is verified — no further actions needed.
      </p>
    );
  }

  const showProof =
    proofRequired && (status === "PENDING" || status === "IN_PROGRESS" || status === "OVERDUE");

  return (
    <div className="space-y-3">
      {showProof && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#726973]">
            Photo proof required to mark done
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
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${
              a.to === "VERIFIED"
                ? "bg-[#440E48] text-white hover:bg-[#5a1260]"
                : a.to === "DONE"
                ? "bg-[#1DBA87] text-white hover:bg-[#18a377]"
                : "bg-[#F0EBF0] text-[#440E48] hover:bg-[#E4DDE4]"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
      {error && (
        <p className="rounded-xl bg-[#FFF0EE] px-4 py-2.5 text-sm font-medium text-[#943B13]">{error}</p>
      )}
    </div>
  );
}
