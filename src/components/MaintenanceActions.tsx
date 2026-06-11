"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MaintenanceStatus } from "@prisma/client";
import { assignMaintenance, transitionMaintenanceStatus } from "@/lib/maintenance";
import { MAINTENANCE_NEXT, MAINTENANCE_STATUS_LABEL } from "@/lib/labels";
import { PhotoUploader } from "./PhotoUploader";

type Assignable = { id: string; name: string };

export function MaintenanceActions({
  id,
  status,
  assignedToId,
  vendor,
  canManage,
  canAct,
  assignables,
}: {
  id: string;
  status: MaintenanceStatus;
  assignedToId: string | null;
  vendor: string | null;
  canManage: boolean;
  canAct: boolean;
  assignables: Assignable[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Resolve form state
  const [showResolve, setShowResolve] = useState(false);
  const [note, setNote] = useState("");
  const [cost, setCost] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  // Assign form state
  const [assignee, setAssignee] = useState(assignedToId ?? "");
  const [vendorName, setVendorName] = useState(vendor ?? "");

  const nexts = MAINTENANCE_NEXT[status].filter((s) => s !== "RESOLVED");
  const canResolve = MAINTENANCE_NEXT[status].includes("RESOLVED");

  function go(to: MaintenanceStatus) {
    setError(null);
    start(async () => {
      const res = await transitionMaintenanceStatus({ id, to });
      if (!res.ok) return setError(res.error ?? "Failed");
      router.refresh();
    });
  }

  function submitResolve() {
    setError(null);
    start(async () => {
      const res = await transitionMaintenanceStatus({
        id,
        to: "RESOLVED",
        resolutionNote: note,
        cost: cost ? Number(cost) : null,
        photoUrls,
      });
      if (!res.ok) return setError(res.error ?? "Failed");
      setShowResolve(false);
      router.refresh();
    });
  }

  function submitAssign() {
    setError(null);
    start(async () => {
      const res = await assignMaintenance({
        id,
        assignedToId: assignee || null,
        vendor: vendorName || null,
      });
      if (!res.ok) return setError(res.error ?? "Failed");
      router.refresh();
    });
  }

  if (!canAct) return null;

  return (
    <div className="m-card space-y-4 p-6">
      <h2 className="text-xs font-bold uppercase tracking-wider text-[#726973]">Actions</h2>

      {/* Status transitions */}
      <div className="flex flex-wrap gap-2">
        {nexts.map((to) => (
          <button
            key={to}
            onClick={() => go(to)}
            disabled={pending}
            className="rounded-xl bg-[#F0EBF0] px-4 py-2 text-sm font-semibold text-[#440E48] transition hover:bg-[#E4DDE4] disabled:opacity-50"
          >
            Mark {MAINTENANCE_STATUS_LABEL[to]}
          </button>
        ))}
        {canResolve && (
          <button
            onClick={() => setShowResolve((v) => !v)}
            disabled={pending}
            className="rounded-xl bg-[#1DBA87] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
          >
            Resolve…
          </button>
        )}
        {status === "RESOLVED" && canManage && (
          <button
            onClick={() => go("CLOSED")}
            disabled={pending}
            className="rounded-xl bg-[#440E48] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5A1560] disabled:opacity-50"
          >
            Close request
          </button>
        )}
      </div>

      {/* Resolve form */}
      {showResolve && (
        <div className="space-y-3 rounded-xl border border-[#E4DDE4] bg-[#F9F6F9] p-4">
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What was done to fix it?"
            className="w-full rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm outline-none focus:border-[#440E48]"
          />
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="Cost (optional)"
            className="w-40 rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm outline-none focus:border-[#440E48]"
          />
          <PhotoUploader value={photoUrls} onChange={setPhotoUrls} disabled={pending} />
          <button
            onClick={submitResolve}
            disabled={pending}
            className="rounded-xl bg-[#1DBA87] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : "Confirm resolved"}
          </button>
        </div>
      )}

      {/* Assignment (managers only) */}
      {canManage && status !== "CLOSED" && (
        <div className="space-y-2 border-t border-[#E4DDE4] pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#726973]">Assign</h3>
          <div className="flex flex-wrap gap-2">
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm outline-none focus:border-[#440E48]"
            >
              <option value="">— Internal staff —</option>
              {assignables.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <input
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="External vendor (optional)"
              className="flex-1 rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm outline-none focus:border-[#440E48]"
            />
            <button
              onClick={submitAssign}
              disabled={pending}
              className="rounded-xl bg-[#F0EBF0] px-4 py-2 text-sm font-semibold text-[#440E48] hover:bg-[#E4DDE4] disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm font-medium text-[#943B13]">{error}</p>}
    </div>
  );
}
