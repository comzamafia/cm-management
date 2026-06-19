import type { BohServerPerformance } from "@/lib/boh-api";

// Presentational report that mirrors the uploaded "Server Performance Report"
// PDF. Rendered on screen and printed verbatim via the browser (Export PDF →
// window.print). The app chrome (sidebar/header) is hidden on print by the
// root layout, so what you see here is what lands in the PDF.

const BRANCH_TZ = "America/Toronto";

function money0(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
function money2(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pct2(n: number): string {
  return `${n.toFixed(2)}%`;
}
function int(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
function fmtGenerated(iso: string): string {
  const s = new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: BRANCH_TZ,
  });
  return s.replace(/\bAM\b/, "a.m.").replace(/\bPM\b/, "p.m.");
}

function scoreFormula(w: BohServerPerformance["weights"]): string {
  const p = (x: number) => Math.round(x * 100);
  return `Score = Sales/hr ${p(w.salesPerHour)}% · Avg/Guest ${p(w.avgPerGuest)}% · Drink% ${p(w.drinkPct)}% · Dessert attach ${p(w.dessertPer100)}% · Discount discipline ${p(w.discount)}% (normalised across servers). Station logins excluded; tips not shown.`;
}

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
    <div id="perf-report" className="rounded-2xl border border-[#E4DDE4] bg-white p-6 sm:p-8 print:rounded-none print:border-0 print:p-0">
      {/* Landscape on print — the table is wide. */}
      <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } }`}</style>

      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E4DDE4] pb-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#A1009B]">
            Performance Score Leaderboard
          </div>
          <h1 className="mt-1 font-[var(--font-cormorant)] text-2xl font-bold tracking-tight text-[#140516] sm:text-[28px]">
            Server Performance Report
          </h1>
          <div className="mt-0.5 text-sm font-medium text-[#726973]">
            {range.from} to {range.to}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-[#440E48] sm:text-xl">{branch.name}</div>
          <div className="mt-0.5 text-xs text-[#A19BA2]">Generated {fmtGenerated(generatedAt)}</div>
        </div>
      </header>

      {/* Stat band */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#EEE7EE] bg-[#EEE7EE] sm:grid-cols-5">
        <Stat label="Team Net Sales" value={money0(team.netSales)} accent="#1DBA87" />
        <Stat label="Guests Served" value={int(team.guests)} accent="#5B8DD9" />
        <Stat label="Avg / Guest" value={money2(team.avgPerGuest)} accent="#F4A626" />
        <Stat label="Drink Mix" value={pct2(team.avgDrinkPct)} accent="#A25DDC" />
        <Stat label="Servers Ranked" value={int(ranked.length)} accent="#440E48" />
      </div>

      {gap > 0 && (
        <p className="mt-3 text-xs text-[#C2820B] print:hidden">
          ⚠ Data covers {haveDays} of {reqDays} day(s) in this range — {gap} day(s) have no uploaded data yet.
        </p>
      )}

      {/* Leaderboard */}
      <h2 className="mb-2 mt-6 text-sm font-bold text-[#140516]">Performance Leaderboard</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-[#E4DDE4] text-left text-[10px] font-bold uppercase tracking-wider text-[#726973]">
              <th className="py-2 pr-2 text-right w-8">#</th>
              <th className="py-2 px-2">Server</th>
              <th className="py-2 px-2 text-right">Score</th>
              <th className="py-2 px-2 text-right">Net Sales</th>
              <th className="py-2 px-2 text-right">Sales/hr</th>
              <th className="py-2 px-2 text-right">Guests</th>
              <th className="py-2 px-2 text-right">Avg/Guest</th>
              <th className="py-2 px-2 text-right">Drink %</th>
              <th className="py-2 px-2 text-right">Dessert /100</th>
              <th className="py-2 pl-2 text-right">Disc %</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((s, i) => (
              <tr key={`${s.name}-${i}`} className="border-b border-[#F3EEF3]">
                <td className="py-1.5 pr-2 text-right font-bold text-[#A19BA2]">{i + 1}</td>
                <td className="py-1.5 px-2 font-semibold text-[#140516]">{s.name}</td>
                <td className="py-1.5 px-2 text-right">
                  <span className="font-bold" style={{ color: scoreColor(s.score) }}>{s.score.toFixed(1)}</span>
                </td>
                <td className="py-1.5 px-2 text-right font-medium text-[#140516]">{money2(s.netSales)}</td>
                <td className="py-1.5 px-2 text-right text-[#433745]">{money2(s.salesPerHour)}</td>
                <td className="py-1.5 px-2 text-right text-[#433745]">{int(s.guests)}</td>
                <td className="py-1.5 px-2 text-right text-[#433745]">{money2(s.avgPerGuest)}</td>
                <td className="py-1.5 px-2 text-right text-[#433745]">{pct2(s.drinkPct)}</td>
                <td className="py-1.5 px-2 text-right text-[#433745]">{int(s.dessertPer100)}</td>
                <td className="py-1.5 pl-2 text-right text-[#433745]">{pct2(s.discountPct)}</td>
              </tr>
            ))}
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
      <p className="mt-5 border-t border-[#E4DDE4] pt-3 text-[11px] leading-relaxed text-[#A19BA2]">
        {scoreFormula(weights)}
      </p>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-white px-4 py-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">{label}</div>
      <div className="mt-1 text-2xl font-extrabold" style={{ color: accent }}>{value}</div>
    </div>
  );
}

// Green (strong) → amber (mid) → grey (low), matching the leaderboard feel.
function scoreColor(score: number): string {
  if (score >= 75) return "#1DBA87";
  if (score >= 50) return "#C2820B";
  return "#9A8E9A";
}
