// Pure SVG bar chart — no external library.
// Shows two series per day: created (slate) and completed (emerald).

type Day = { date: string; created: number; completed: number; verified: number };

const W = 640;
const H = 180;
const PAD = { top: 10, right: 16, bottom: 36, left: 36 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

export function TrendChart({ data }: { data: Day[] }) {
  if (data.length === 0) return <p className="text-sm text-slate-400">No data.</p>;

  const maxVal = Math.max(...data.flatMap((d) => [d.created, d.completed + d.verified]), 1);
  const groupW = PLOT_W / data.length;
  const barW = Math.max(4, groupW * 0.32);
  const gap = barW * 0.4;

  const yTicks = [0, Math.ceil(maxVal / 2), maxVal];

  function barX(i: number, series: 0 | 1) {
    const center = PAD.left + i * groupW + groupW / 2;
    return series === 0 ? center - gap / 2 - barW : center + gap / 2;
  }

  function barH(v: number) {
    return (v / maxVal) * PLOT_H;
  }

  function barY(v: number) {
    return PAD.top + PLOT_H - barH(v);
  }

  // X-axis label — show only every Nth to avoid crowding.
  const step = data.length <= 7 ? 1 : data.length <= 14 ? 2 : 4;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-2xl"
        aria-label="Task trend chart"
      >
        {/* Y-axis gridlines + labels */}
        {yTicks.map((v) => {
          const y = barY(v);
          return (
            <g key={v}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e2e8f0" strokeWidth={1} />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">
                {v}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const completed = d.completed + d.verified;
          return (
            <g key={d.date}>
              {/* Created bar */}
              {d.created > 0 && (
                <rect
                  x={barX(i, 0)}
                  y={barY(d.created)}
                  width={barW}
                  height={barH(d.created)}
                  fill="#94a3b8"
                  rx={2}
                >
                  <title>{`${d.date}: ${d.created} created`}</title>
                </rect>
              )}
              {/* Completed bar */}
              {completed > 0 && (
                <rect
                  x={barX(i, 1)}
                  y={barY(completed)}
                  width={barW}
                  height={barH(completed)}
                  fill="#34d399"
                  rx={2}
                >
                  <title>{`${d.date}: ${completed} completed`}</title>
                </rect>
              )}
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => {
          if (i % step !== 0) return null;
          const x = PAD.left + i * groupW + groupW / 2;
          const label = d.date.slice(5); // MM-DD
          return (
            <text key={d.date} x={x} y={H - 6} textAnchor="middle" fontSize={9} fill="#94a3b8">
              {label}
            </text>
          );
        })}

        {/* Baseline */}
        <line
          x1={PAD.left}
          y1={PAD.top + PLOT_H}
          x2={W - PAD.right}
          y2={PAD.top + PLOT_H}
          stroke="#cbd5e1"
          strokeWidth={1}
        />
      </svg>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-400" /> Created
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400" /> Completed
        </span>
      </div>
    </div>
  );
}
