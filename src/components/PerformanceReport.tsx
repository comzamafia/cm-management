import type { BohServerPerformance } from "@/lib/boh-api";
import { money0, money2, pct, int, fmtGenerated, scoreFormula } from "@/lib/perf-format";

// Presentational report that mirrors the official "Server Performance Report"
// PDF (dark navy header band, bordered stat tiles, navy leaderboard header with
// rank-1 highlight). Rendered on screen; the same data is rendered to a real
// downloadable PDF by src/lib/performance-pdf.tsx (Export PDF button).

const NAVY = "#1F2A37";

export function PerformanceReport({ data }: { data: BohServerPerformance }) {
  const { branch, range, generatedAt, team, servers, weights, coverage } = data;

  // Leaderboard: real servers only (stations excluded), ranked by score desc.
  const ranked = servers
    .filter((s) => !s.isStation)
    .sort((a, b) => b.score - a.score);

  // Coverage gap (shown on screen only — informational).
  const reqDays = Math.round(
    (new Date(`${range.to}T00:00:00Z`).getTime() - new Date(`${range.from}T00:00:00Z`).getTime()) / 86400000,
  ) + 1;
  const haveDays = coverage?.length ?? 0;
  const gap = reqDays - haveDays;

  return (
    <div id="perf-report" className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white print:rounded-none print:border-0">
      <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } #perf-report, #perf-report * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }`}</style>

      {/* Navy header band */}
      <header className="flex flex-wrap items-start justify-between gap-3 px-6 py-5 sm:px-8" style={{ backgroundColor: NAVY }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[28px]">Server Performance Report</h1>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.15em] text-[#5B9BD5]">
            Performance Score Leaderboard
          </div>
          <div className="mt-1 text-sm text-[#9CA3AF]">{range.from}&nbsp;&nbsp;to&nbsp;&nbsp;{range.to}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-white sm:text-xl">{branch.name}</div>
          <div className="mt-1 text-xs text-[#9CA3AF]">Generated {fmtGenerated(generatedAt)}</div>
        </div>
      </header>

      <div className="px-6 py-5 sm:px-8">
        {/* Stat tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Team Net Sales" value={money0(team.netSales)} />
          <Stat label="Guests Served" value={int(team.guests)} />
          <Stat label="Avg / Guest" value={money2(team.avgPerGuest)} />
          <Stat label="Drink Mix" value={pct(team.avgDrinkPct)} />
          <Stat label="Servers Ranked" value={int(ranked.length)} />
        </div>

        {gap > 0 && (
          <p className="mt-3 text-xs text-[#C2820B] print:hidden">
            ⚠ Data covers {haveDays} of {reqDays} day(s) in this range — {gap} day(s) have no uploaded data yet.
          </p>
        )}

        {/* Leaderboard */}
        <h2 className="mb-2 mt-6 text-base font-bold text-[#1F2937]">Performance Leaderboard</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: NAVY }}>
                <th className="px-3 py-2.5 text-center">#</th>
                <th className="px-3 py-2.5 text-left">Server</th>
                <th className="px-3 py-2.5 text-center">Score</th>
                <th className="px-3 py-2.5 text-right">Net Sales</th>
                <th className="px-3 py-2.5 text-right">Sales/hr</th>
                <th className="px-3 py-2.5 text-right">Guests</th>
                <th className="px-3 py-2.5 text-right">Avg/Guest</th>
                <th className="px-3 py-2.5 text-right">Drink %</th>
                <th className="px-3 py-2.5 text-right">Dessert /100</th>
                <th className="px-3 py-2.5 text-right">Disc %</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((s, i) => {
                const bg = i === 0 ? "#FDF7E3" : i % 2 === 0 ? "#F7F9FC" : "#FFFFFF";
                return (
                  <tr key={`${s.name}-${i}`} style={{ backgroundColor: bg }} className="border-b border-[#EEF1F4]">
                    <td className="px-3 py-2 text-center font-bold text-[#9CA3AF]">{i + 1}</td>
                    <td className="px-3 py-2 font-semibold text-[#1F2937]">{s.name}</td>
                    <td className="px-3 py-2 text-center font-bold text-[#1F2937]">{s.score.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right font-medium text-[#1F2937]">{money2(s.netSales)}</td>
                    <td className="px-3 py-2 text-right text-[#4B5563]">{money2(s.salesPerHour)}</td>
                    <td className="px-3 py-2 text-right text-[#4B5563]">{int(s.guests)}</td>
                    <td className="px-3 py-2 text-right text-[#4B5563]">{money2(s.avgPerGuest)}</td>
                    <td className="px-3 py-2 text-right text-[#4B5563]">{pct(s.drinkPct)}</td>
                    <td className="px-3 py-2 text-right text-[#4B5563]">{int(s.dessertPer100)}</td>
                    <td className="px-3 py-2 text-right text-[#4B5563]">{pct(s.discountPct)}</td>
                  </tr>
                );
              })}
              {ranked.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-sm text-[#A19BA2]">
                    No ranked servers for this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer formula */}
        <p className="mt-5 border-t border-[#E5E7EB] pt-3 text-[11px] leading-relaxed text-[#9CA3AF]">
          {scoreFormula(weights)}
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-[#FBFBFC] px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-[#1F2937]">{value}</div>
    </div>
  );
}
