"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { ReservationDashboardResult } from "@/lib/reservations";
import { ReservationTableAssignments } from "./ReservationTableAssignments";

const RUSH_COLOR: Record<string, string> = {
  "FULL RUSH": "bg-[#e2445c1a] text-[#e2445c]",
  "HIGH PRESSURE": "bg-[#e2445c1a] text-[#e2445c]",
  "LATE RUSH": "bg-[#F4A6261a] text-[#F4A626]",
  MODERATE: "bg-[#F4A6261a] text-[#F4A626]",
  STEADY: "bg-[#1DBA871a] text-[#1DBA87]",
};

const PRESSURE_DOT: Record<string, string> = {
  CRITICAL: "bg-[#e2445c]",
  HEAVY: "bg-[#e2445c]",
  MODERATE: "bg-[#F4A626]",
  LIGHT: "bg-[#1DBA87]",
};

export function ReservationDashboard({
  result,
  importDates,
  locations,
  selectedLocationId,
}: {
  result: ReservationDashboardResult;
  importDates: string[];
  locations: { id: string; name: string }[];
  selectedLocationId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="space-y-5">
      {/* Location + date pickers */}
      <div className="flex flex-wrap items-center gap-3">
        {locations.length > 1 && (
          <select
            value={selectedLocationId}
            onChange={(e) => setParam("locationId", e.target.value)}
            className="rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm text-[#140516] outline-none focus:border-[#440E48]"
          >
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
        {importDates.length > 0 && (
          <select
            value={result?.businessDate ?? ""}
            onChange={(e) => setParam("date", e.target.value)}
            className="rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm text-[#140516] outline-none focus:border-[#440E48]"
          >
            {importDates.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>

      {!result ? (
        <div className="m-card p-8 text-center text-sm text-[#726973]">
          No reservation data uploaded yet for this location. Upload a CSV above to get started.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-[#140516]">Host Dashboard — {result.businessDate}</h2>
              <p className="text-xs text-[#A19BA2]">
                {result.fileName ?? "Reservation export"} · uploaded by {result.uploadedByName} · last updated {result.uploadedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* Hourly Overview */}
            <section className="m-card p-5 lg:col-span-1">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">Hourly Overview</h3>
              <table className="w-full text-sm">
                <thead className="text-left text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">
                  <tr><th className="pb-2">Time</th><th className="pb-2">Res.</th><th className="pb-2">Covers</th><th className="pb-2">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-[#f3eef3]">
                  {result.dashboard.hourly.map((h) => (
                    <tr key={h.bucketMinutes}>
                      <td className="py-1.5 font-medium text-[#140516]">{h.timeLabel}</td>
                      <td className="py-1.5 text-[#726973]">{h.reservations}</td>
                      <td className="py-1.5 text-[#726973]">{h.covers}</td>
                      <td className="py-1.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${RUSH_COLOR[h.rushLevel]}`}>{h.rushLevel}</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-[#E4DDE4] font-bold text-[#140516]">
                    <td className="pt-2">Total</td>
                    <td className="pt-2">{result.dashboard.snapshot.totalActiveReservations}</td>
                    <td className="pt-2">{result.dashboard.snapshot.totalCovers}</td>
                    <td className="pt-2"></td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* Total Night Snapshot */}
            <section className="m-card p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">Total Night Snapshot</h3>
              <ul className="space-y-2.5 text-sm">
                <Snap label="Total Active Reservations" value={result.dashboard.snapshot.totalActiveReservations} color="#440E48" />
                <Snap label="Total Covers" value={result.dashboard.snapshot.totalCovers} color="#440E48" />
                <Snap label="Large Parties (6+)" value={result.dashboard.snapshot.largePartyCount} color="#5B8DD9" />
                <Snap label="Birthday Tables" value={result.dashboard.snapshot.birthdayCount} color="#F4A626" />
                <Snap label="Missing Tables" value={result.dashboard.snapshot.missingTableCount} color="#e2445c" />
                <Snap label="Cancelled Reservations" value={result.dashboard.snapshot.cancelledCount} color="#A19BA2" />
              </ul>
            </section>

            {/* Large Party Tracker */}
            <section className="m-card p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">Large Party Tracker</h3>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {result.dashboard.largeParties.length === 0 && <p className="text-sm text-[#A19BA2]">No large parties tonight.</p>}
                {result.dashboard.largeParties.map((p, i) => (
                  <div key={i} className="rounded-lg border border-[#E4DDE4] px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#140516]">{p.name}</span>
                      <span className="text-xs text-[#726973]">{p.timeLabel} · {p.guests} guests</span>
                    </div>
                    {p.notes && <p className="mt-0.5 text-xs text-[#A19BA2]">{p.notes}</p>}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Covers by Hour chart */}
          <section className="m-card p-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">Covers by Hour</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.dashboard.hourly}>
                  <XAxis dataKey="timeLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="covers" fill="#440E48" name="Covers" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="reservations" fill="#F4A626" name="Reservations" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Assign Tables */}
          <ReservationTableAssignments reservations={result.dashboard.activeReservations} />

          {/* Floor Pressure Map */}
          {result.dashboard.floorZones.length > 0 && (
            <section className="m-card p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">Floor Pressure Map</h3>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {result.dashboard.floorZones.map((z) => (
                  <div key={z.name} className="rounded-lg border border-[#E4DDE4] p-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#726973]">{z.name}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-[#140516]">
                      <span className={`h-2 w-2 rounded-full ${PRESSURE_DOT[z.pressureLevel]}`} />
                      {z.pressureLevel}
                    </div>
                    <div className="mt-1 text-xs text-[#A19BA2]">{z.reservationCount}/{z.tableCount} tables · {z.covers} covers</div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-[#A19BA2]">Only zones with a confirmed table mapping are shown — more sections coming as the floor plan is confirmed.</p>
            </section>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            {/* Host Action Items */}
            <section className="m-card p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">Host Action Items</h3>
              <div className="space-y-3">
                {result.dashboard.actionItems.map((p, i) => (
                  <div key={i}>
                    <div className="text-xs font-bold text-[#440E48]">{p.phase}</div>
                    <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-[#433745]">
                      {p.bullets.map((b, j) => <li key={j}>{b}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* Table Issues */}
            <section className="m-card p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">Table Issues</h3>
              {result.dashboard.tableIssues.length === 0 ? (
                <p className="text-sm text-[#A19BA2]">No issues flagged.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">
                    <tr><th className="pb-2">Issue</th><th className="pb-2">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3eef3]">
                    {result.dashboard.tableIssues.map((t, i) => (
                      <tr key={i}>
                        <td className="py-1.5 pr-3 font-medium text-[#140516]">{t.issue}</td>
                        <td className="py-1.5 text-[#726973]">{t.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>

          {/* Host Communication Plan */}
          <section className="m-card p-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">Host Communication Plan</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {result.dashboard.communicationPlan.map((p, i) => (
                <div key={i}>
                  <div className="text-xs font-bold text-[#440E48]">{p.phase}</div>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-[#433745]">
                    {p.bullets.map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Notes */}
          <section className="m-card flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-xs text-[#726973]">
            {result.dashboard.quickNotes.map((n, i) => <span key={i}>• {n}</span>)}
          </section>
        </>
      )}
    </div>
  );
}

function Snap({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-[#433745]">{label}</span>
      <span className="text-lg font-extrabold" style={{ color }}>{value}</span>
    </li>
  );
}
