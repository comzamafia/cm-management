import type { BohServerPerformance, BohServer } from "@/lib/boh-api";
import { money2, pct, fmtGenerated } from "@/lib/perf-format";

const NAVY = "#1F2A37";
const PURPLE = "#440E48";
const BLUE = "#5B8DD9";
const GOLD = "#F4A626";

type Ranked = BohServer & { rank: number };

export function PerformanceUpsell({ data }: { data: BohServerPerformance }) {
  const { branch, range, generatedAt, team, servers } = data;

  const ranked: Ranked[] = servers
    .filter((s) => !s.isStation)
    .sort((a, b) => b.drinkPct - a.drinkPct)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  // For charts: sort by relevant metric.
  const byDrink = [...ranked].sort((a, b) => b.drinkPct - a.drinkPct);
  const byDessert = [...ranked].sort((a, b) => b.dessertPct - a.dessertPct);
  const maxDrink = Math.max(...byDrink.map((s) => s.drinkPct), 1);
  const maxDessert = Math.max(...byDessert.map((s) => s.dessertPct), 1);

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
        <header className="flex flex-wrap items-start justify-between gap-3 px-6 py-5 sm:px-8" style={{ backgroundColor: NAVY }}>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[28px]">Beverage, Liquor & Dessert</h1>
            <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.15em] text-[#5B9BD5]">
              Upsell % Breakdown
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Liquor + Beverage %" value={pct(team.avgDrinkPct)} accent={PURPLE} sub="team average" />
            <Tile label="Liquor %" value={pct(team.liquorPct)} accent="#7C3AED" sub="of net sales" />
            <Tile label="Beverage %" value={pct(team.beveragePct)} accent={BLUE} sub="of net sales" />
            <Tile label="Dessert %" value={pct(team.dessertPct)} accent={GOLD} sub="of net sales" />
          </div>

          {/* Table */}
          <h2 className="mb-2 mt-6 text-sm font-bold text-[#1F2937]">
            Beverage, Liquor & Dessert
            <span className="ml-2 text-xs font-normal text-[#9CA3AF]">({ranked.length})</span>
          </h2>
          <p className="mb-3 text-xs text-[#9CA3AF]">% is share of each server&apos;s net sales. Sorted by Liquor+Bev % descending.</p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: NAVY }}>
                  <th className="px-3 py-2.5 text-center w-8">#</th>
                  <th className="px-3 py-2.5 text-left">Server</th>
                  <th className="px-3 py-2.5 text-right">Avg/Guest</th>
                  <th className="px-3 py-2.5 text-right">Liquor $</th>
                  <th className="px-3 py-2.5 text-right">Liquor %</th>
                  <th className="px-3 py-2.5 text-right">Bev $</th>
                  <th className="px-3 py-2.5 text-right">Bev %</th>
                  <th className="px-2 py-2.5 text-right" style={{ minWidth: 140 }}>Liquor+Bev %</th>
                  <th className="px-3 py-2.5 text-right">Dessert $</th>
                  <th className="px-3 py-2.5 text-right">Dessert %</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((s, i) => {
                  const bg = i === 0 ? "#FDF7E3" : i % 2 === 0 ? "#F7F9FC" : "#FFFFFF";
                  return (
                    <tr key={`${s.name}-${i}`} style={{ backgroundColor: bg }} className="border-b border-[#EEF1F4]">
                      <td className="px-3 py-2 text-center font-bold text-[#9CA3AF]">{s.rank}</td>
                      <td className="px-3 py-2 font-semibold text-[#1F2937]">{s.name}</td>
                      <td className="px-3 py-2 text-right font-medium text-[#1F2937]">{money2(s.avgPerGuest)}</td>
                      <td className="px-3 py-2 text-right text-[#4B5563]">{money2(s.alcoholSales)}</td>
                      <td className="px-3 py-2 text-right text-[#4B5563]">{pct(s.alcoholPct)}</td>
                      <td className="px-3 py-2 text-right text-[#4B5563]">{money2(s.beverageSales)}</td>
                      <td className="px-3 py-2 text-right text-[#4B5563]">{pct(s.beveragePct)}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#F0EBF0]" style={{ minWidth: 60 }}>
                            <div className="flex h-full">
                              <div className="h-full" style={{ width: `${(s.alcoholPct / Math.max(maxDrink, 1)) * 100}%`, backgroundColor: PURPLE }} />
                              <div className="h-full" style={{ width: `${(s.beveragePct / Math.max(maxDrink, 1)) * 100}%`, backgroundColor: BLUE }} />
                            </div>
                          </div>
                          <span className="shrink-0 text-xs font-bold text-[#440E48]">{pct(s.drinkPct)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-[#4B5563]">{money2(s.dessertSales)}</td>
                      <td className="px-3 py-2 text-right text-[#4B5563]">{pct(s.dessertPct)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Liquor + Beverage % stacked */}
        <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6">
          <h3 className="mb-1 text-sm font-bold text-[#1F2937]">Liquor + Beverage % (stacked)</h3>
          <p className="mb-4 text-xs text-[#9CA3AF]">Share of each server&apos;s net sales</p>
          <div className="space-y-2">
            {byDrink.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="w-28 shrink-0 truncate text-xs font-medium text-[#4B5563] sm:w-36">{s.name}</span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-[#F5F3F5]">
                  <div className="flex h-full">
                    <div className="h-full" style={{ width: `${(s.alcoholPct / Math.max(maxDrink, 1)) * 100}%`, backgroundColor: PURPLE }} />
                    <div className="h-full" style={{ width: `${(s.beveragePct / Math.max(maxDrink, 1)) * 100}%`, backgroundColor: BLUE }} />
                  </div>
                </div>
                <span className="w-12 shrink-0 text-right text-xs font-bold text-[#440E48]">{pct(s.drinkPct)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-5 text-xs text-[#726973]">
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: PURPLE }} /> Liquor</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: BLUE }} /> Beverage</span>
          </div>
        </div>

        {/* Dessert % */}
        <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6">
          <h3 className="mb-1 text-sm font-bold text-[#1F2937]">Dessert % (attach)</h3>
          <p className="mb-4 text-xs text-[#9CA3AF]">Dessert sales as % of each server&apos;s net sales</p>
          <div className="space-y-2">
            {byDessert.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="w-28 shrink-0 truncate text-xs font-medium text-[#4B5563] sm:w-36">{s.name}</span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-[#FFF9ED]">
                  <div className="h-full rounded" style={{ width: `${(s.dessertPct / Math.max(maxDessert, 1)) * 100}%`, backgroundColor: GOLD }} />
                </div>
                <span className="w-12 shrink-0 text-right text-xs font-bold text-[#92680E]">{pct(s.dessertPct)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-[#9CA3AF]">
        Note: station logins (host) are excluded from ranking.
      </p>
    </div>
  );
}

function Tile({ label, value, accent, sub }: { label: string; value: string; accent: string; sub: string }) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-[#FBFBFC] px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">{label}</div>
      <div className="mt-1 text-2xl font-extrabold" style={{ color: accent }}>{value}</div>
      <div className="mt-0.5 text-[10px] text-[#B8B3B9]">{sub}</div>
    </div>
  );
}
