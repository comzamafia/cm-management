"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignReservationTable } from "@/lib/reservations";
import type { ActiveReservationRow } from "@/lib/reservation-data";

export function ReservationTableAssignments({ reservations }: { reservations: ActiveReservationRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save(recordId: string, value: string) {
    setSavingId(recordId);
    setError(null);
    startTransition(async () => {
      const res = await assignReservationTable(recordId, value);
      setSavingId(null);
      if (!res.ok) {
        setError(res.error ?? "Couldn't save that table assignment");
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="m-card p-5">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#726973]">Assign Tables</h3>
        <span className="text-[11px] text-[#A19BA2]">CSV table numbers are shown for reference only — enter the real table here</span>
      </div>
      {error && <p className="mb-2 text-xs font-medium text-[#e2445c]">{error}</p>}
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white text-left text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">
            <tr>
              <th className="pb-2 pr-3">Time</th>
              <th className="pb-2 pr-3">Guest</th>
              <th className="pb-2 pr-3">Guests</th>
              <th className="pb-2 pr-3">CSV Ref</th>
              <th className="pb-2">Table</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3eef3]">
            {reservations.map((r) => {
              if (!r.recordId) return null;
              const value = drafts[r.recordId] ?? r.tableAssignment;
              return (
                <tr key={r.recordId}>
                  <td className="py-1.5 pr-3 text-[#726973]">{r.timeLabel}</td>
                  <td className="py-1.5 pr-3 font-medium text-[#140516]">{r.name}</td>
                  <td className="py-1.5 pr-3 text-[#726973]">{r.guests}</td>
                  <td className="py-1.5 pr-3 text-xs text-[#A19BA2]">{r.csvTableRef || "—"}</td>
                  <td className="py-1.5">
                    <input
                      value={value}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [r.recordId!]: e.target.value }))}
                      onBlur={(e) => {
                        if (e.target.value !== r.tableAssignment) save(r.recordId!, e.target.value);
                      }}
                      placeholder="e.g. L1,L2"
                      disabled={savingId === r.recordId}
                      className="w-28 rounded-md border border-[#E4DDE4] px-2 py-1 text-sm outline-none focus:border-[#440E48] disabled:opacity-50"
                    />
                  </td>
                </tr>
              );
            })}
            {reservations.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-center text-[#A19BA2]">No active reservations tonight.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
