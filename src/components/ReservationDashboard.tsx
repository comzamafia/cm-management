"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import type { ReservationDashboardResult } from "@/lib/reservations";

const RUSH_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  "FULL RUSH": { bg: "#FEE2E2", text: "#B91C1C", dot: "#DC2626" },
  "HIGH PRESSURE": { bg: "#FEE2E2", text: "#B91C1C", dot: "#DC2626" },
  "LATE RUSH": { bg: "#FEF3C7", text: "#B45309", dot: "#F59E0B" },
  MODERATE: { bg: "#FEF3C7", text: "#B45309", dot: "#F59E0B" },
  STEADY: { bg: "#FEF3C7", text: "#B45309", dot: "#F59E0B" },
};

const PRESSURE_STYLE: Record<string, { text: string; dot: string }> = {
  CRITICAL: { text: "#B91C1C", dot: "#DC2626" },
  HEAVY: { text: "#B91C1C", dot: "#DC2626" },
  MODERATE: { text: "#B45309", dot: "#F59E0B" },
  LIGHT: { text: "#15803D", dot: "#16A34A" },
};

function Icon({ children, size = 18 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const I = {
  clock: <Icon><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Icon>,
  bars: <Icon><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></Icon>,
  users: <Icon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Icon>,
  calendar: <Icon><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Icon>,
  cake: <Icon><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" /><path d="M4 16h16" /><path d="M12 3v4" /><path d="M8 11V8a2 2 0 0 1 4 0 2 2 0 0 0 4 0V8" /></Icon>,
  question: <Icon><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></Icon>,
  xCircle: <Icon><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></Icon>,
  checklist: <Icon><path d="M11 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6" /><path d="m9 11 3 3L22 4" /></Icon>,
  alert: <Icon><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Icon>,
  chat: <Icon><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Icon>,
  map: <Icon><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></Icon>,
  note: <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></Icon>,
  trend: <Icon size={14}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></Icon>,
  check: <Icon size={14}><polyline points="20 6 9 17 4 12" /></Icon>,
  table: <Icon size={14}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Icon>,
};

function SectionHead({ icon, title, color = "var(--rv-navy)" }: { icon: React.ReactNode; title: string; color?: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span style={{ color }}>{icon}</span>
      <h3 className="text-sm font-extrabold" style={{ color: "var(--rv-navy)" }}>{title}</h3>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border p-5 ${className}`}
      style={{ background: "var(--rv-card)", borderColor: "var(--rv-border)", boxShadow: "0 1px 3px rgba(16,33,63,0.06)" }}
    >
      {children}
    </section>
  );
}

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

  const selectCls = "rounded-lg border px-3 py-2 text-sm outline-none";
  const selectStyle = { background: "var(--rv-card)", borderColor: "var(--rv-border)", color: "var(--rv-navy)" };

  return (
    <div className="space-y-5">
      {/* Location + date pickers */}
      <div className="flex flex-wrap items-center gap-3">
        {locations.length > 1 && (
          <select value={selectedLocationId} onChange={(e) => setParam("locationId", e.target.value)} className={selectCls} style={selectStyle}>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
        {importDates.length > 0 && (
          <select value={result?.businessDate ?? ""} onChange={(e) => setParam("date", e.target.value)} className={selectCls} style={selectStyle}>
            {importDates.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        {result && (
          <a
            href={`/reservations/pdf?locationId=${selectedLocationId}&date=${result.businessDate}`}
            className="ml-auto rounded-lg border px-3 py-2 text-sm font-bold"
            style={{ borderColor: "var(--rv-blue)", color: "var(--rv-blue)", background: "var(--rv-card)" }}
          >
            ↓ Export PDF
          </a>
        )}
      </div>

      {!result ? (
        <Card>
          <p className="text-center text-sm" style={{ color: "var(--rv-text-soft)" }}>
            No reservation data uploaded yet for this location. Upload a CSV above to get started.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Hourly Overview */}
            <Card className="lg:col-span-1">
              <SectionHead icon={I.clock} title="Hourly Overview" />
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--rv-navy)" }}>
                    <th className="rounded-l-md px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white">Time</th>
                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white">Res.</th>
                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white">Covers</th>
                    <th className="rounded-r-md px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.dashboard.hourly.map((h) => {
                    const s = RUSH_STYLE[h.rushLevel];
                    return (
                      <tr key={h.bucketMinutes} className="border-b" style={{ borderColor: "var(--rv-border)" }}>
                        <td className="py-2 px-2 font-semibold" style={{ color: "var(--rv-navy)" }}>{h.timeLabel}</td>
                        <td className="py-2 px-2" style={{ color: "var(--rv-text-soft)" }}>{h.reservations}</td>
                        <td className="py-2 px-2" style={{ color: "var(--rv-text-soft)" }}>{h.covers}</td>
                        <td className="py-2 px-2">
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: s.bg, color: s.text }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
                            {h.rushLevel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: "var(--rv-navy)" }}>
                    <td className="rounded-l-md py-2 px-2 text-xs font-bold uppercase text-white">Total (Active)</td>
                    <td className="py-2 px-2 text-sm font-bold text-white">{result.dashboard.snapshot.totalActiveReservations}</td>
                    <td className="py-2 px-2 text-sm font-bold text-white">{result.dashboard.snapshot.totalCovers}</td>
                    <td className="rounded-r-md py-2 px-2"></td>
                  </tr>
                </tbody>
              </table>
            </Card>

            {/* Total Night Snapshot */}
            <Card>
              <SectionHead icon={I.bars} title="Total Night Snapshot" />
              <ul className="space-y-3 text-sm">
                <SnapRow icon={I.calendar} label="Total Active Reservations" value={result.dashboard.snapshot.totalActiveReservations} color="var(--rv-blue)" />
                <SnapRow icon={I.users} label="Total Covers" value={result.dashboard.snapshot.totalCovers} color="var(--rv-teal)" />
                <SnapRow icon={I.users} label="Large Parties (6+)" value={result.dashboard.snapshot.largePartyCount} color="var(--rv-green)" />
                <SnapRow icon={I.cake} label="Birthday Tables" value={result.dashboard.snapshot.birthdayCount} color="var(--rv-purple)" />
                <SnapRow icon={I.question} label="Missing Tables" value={result.dashboard.snapshot.missingTableCount} color="var(--rv-red)" />
                <SnapRow icon={I.xCircle} label="Cancelled Reservations" value={result.dashboard.snapshot.cancelledCount} color="var(--rv-red)" />
              </ul>
            </Card>

            {/* Large Party Tracker */}
            <Card>
              <SectionHead icon={I.users} title="Large Party Tracker" />
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--rv-navy)" }}>
                      <th className="rounded-l-md px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white">Time</th>
                      <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white">Name</th>
                      <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white">Guests</th>
                      <th className="rounded-r-md px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.dashboard.largeParties.map((p, i) => (
                      <tr key={i} className="border-b" style={{ borderColor: "var(--rv-border)" }}>
                        <td className="py-2 px-2 whitespace-nowrap" style={{ color: "var(--rv-text-soft)" }}>{p.timeLabel}</td>
                        <td className="py-2 px-2 font-semibold" style={{ color: "var(--rv-navy)" }}>{p.name}</td>
                        <td className="py-2 px-2 text-center font-bold" style={{ color: "var(--rv-red)" }}>{p.guests}</td>
                        <td className="py-2 px-2 text-xs" style={{ color: "var(--rv-text-soft)" }}>{p.notes || "—"}</td>
                      </tr>
                    ))}
                    {result.dashboard.largeParties.length === 0 && (
                      <tr><td colSpan={4} className="py-4 text-center text-sm" style={{ color: "var(--rv-text-soft)" }}>No large parties tonight.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Covers by Hour chart */}
          <Card>
            <SectionHead icon={I.bars} title="Covers by Hour" />
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.dashboard.hourly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EC" vertical={false} />
                  <XAxis dataKey="timeLabel" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={{ stroke: "#E4E7EC" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ border: "1px solid #E4E7EC", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="covers" fill="#10213F" name="Covers" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="reservations" fill="#0D9488" name="Reservations" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {result.dashboard.peak && (
              <p className="mt-2 text-xs font-semibold" style={{ color: "var(--rv-blue)" }}>
                Peak Time: {result.dashboard.peak.timeLabel} ({result.dashboard.peak.covers} Covers)
              </p>
            )}
          </Card>

          {/* Floor Pressure Map */}
          {result.dashboard.floorZones.length > 0 && (
            <Card>
              <SectionHead icon={I.map} title="Floor Pressure Map" />
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {result.dashboard.floorZones.map((z) => {
                  const s = PRESSURE_STYLE[z.pressureLevel];
                  return (
                    <div key={z.name} className="text-center">
                      <div className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--rv-text-soft)" }}>{z.name}</div>
                      <div className="mx-auto grid w-fit grid-cols-2 gap-1">
                        {Array.from({ length: Math.min(z.tableCount, 6) }).map((_, i) => (
                          <span key={i} className="h-5 w-5 rounded-md border" style={{ borderColor: s.dot, background: `${s.dot}1a` }} />
                        ))}
                      </div>
                      <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold" style={{ color: s.text }}>
                        <span className="h-2 w-2 rounded-full" style={{ background: s.dot }} />
                        {z.pressureLevel}
                      </div>
                      <div className="mt-0.5 text-[11px]" style={{ color: "var(--rv-text-soft)" }}>{z.reservationCount}/{z.tableCount} tables</div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px]" style={{ color: "var(--rv-text-soft)" }}>Only zones with a confirmed table mapping are shown.</p>
            </Card>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            {/* Host Action Items */}
            <Card>
              <SectionHead icon={I.checklist} title="Host Action Items" />
              <div className="space-y-4">
                {result.dashboard.actionItems.map((p, i) => {
                  const phaseColor = i === 0 ? "var(--rv-red)" : i === 1 ? "var(--rv-amber)" : "var(--rv-green)";
                  return (
                    <div key={i}>
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-extrabold uppercase" style={{ color: phaseColor }}>
                        <span style={{ color: phaseColor }}>{I.clock}</span>
                        {p.phase}
                      </div>
                      <ul className="space-y-1 pl-1 text-sm" style={{ color: "var(--rv-navy)" }}>
                        {p.bullets.map((b, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: phaseColor }} />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Table Issues */}
            <Card>
              <SectionHead icon={I.alert} title="Table Issues" color="var(--rv-amber)" />
              {result.dashboard.tableIssues.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--rv-text-soft)" }}>No issues flagged.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--rv-navy)" }}>
                      <th className="rounded-l-md px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white">Issue</th>
                      <th className="rounded-r-md px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-white">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.dashboard.tableIssues.map((t, i) => (
                      <tr key={i} className="border-b" style={{ borderColor: "var(--rv-border)" }}>
                        <td className="py-2 px-2">
                          <span className="flex items-center gap-1.5 font-semibold" style={{ color: "var(--rv-navy)" }}>
                            <span style={{ color: "var(--rv-red)" }}>{I.question}</span>
                            {t.issue}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-medium" style={{ color: "var(--rv-red)" }}>{t.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>

          {/* Host Communication Plan */}
          <Card>
            <SectionHead icon={I.chat} title="Host Communication Plan" />
            <div className="grid gap-4 sm:grid-cols-3">
              {result.dashboard.communicationPlan.map((p, i) => {
                const phaseColor = i === 0 ? "var(--rv-navy)" : i === 1 ? "var(--rv-amber)" : "var(--rv-green)";
                return (
                  <div key={i}>
                    <div className="mb-1 text-xs font-extrabold uppercase tracking-wide" style={{ color: phaseColor }}>{p.phase}</div>
                    <ul className="space-y-1 text-sm" style={{ color: "var(--rv-navy)" }}>
                      {p.bullets.map((b, j) => (
                        <li key={j} className="flex items-start gap-2">
                          <span className="mt-0.5 shrink-0" style={{ color: phaseColor }}>{I.check}</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Quick Notes */}
          <Card>
            <SectionHead icon={I.note} title="Quick Notes" />
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs" style={{ color: "var(--rv-text-soft)" }}>
              {result.dashboard.quickNotes.map((n, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span style={{ color: "var(--rv-blue)" }}>{I.trend}</span>
                  {n}
                </span>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function SnapRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2" style={{ color: "var(--rv-navy)" }}>
        <span style={{ color }}>{icon}</span>
        {label}
      </span>
      <span className="text-lg font-extrabold" style={{ color }}>{value}</span>
    </li>
  );
}
