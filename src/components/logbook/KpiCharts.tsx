"use client";

import { AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import type { getKpiData } from "@/lib/logbook";

type KpiData = Awaited<ReturnType<typeof getKpiData>>;

const DEPT_COLORS = ["var(--lb-accent)", "var(--lb-green)"];

export function KpiCharts({ data }: { data: KpiData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Entries today */}
      <div className="rounded-xl border p-4" style={{ background: "var(--lb-surface)", borderColor: "var(--lb-border)" }}>
        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--lb-text-soft)" }}>Entries Today</div>
        <div className="text-3xl font-extrabold" style={{ color: "var(--lb-accent)" }}>{data.totalToday}</div>
        <div className="mt-2 h-14">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.hourly}>
              <Area type="monotone" dataKey="count" stroke="var(--lb-accent)" fill="var(--lb-accent)" fillOpacity={0.25} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Complaints trend */}
      <div className="rounded-xl border p-4" style={{ background: "var(--lb-surface)", borderColor: "var(--lb-border)" }}>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--lb-text-soft)" }}>Complaints — Last 7 Days</div>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.complaintsByDay}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--lb-text-soft)" }} tickFormatter={(d: string) => d.slice(5)} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--lb-surface-2)", border: "1px solid var(--lb-border)", fontSize: 11 }} />
              <Line type="monotone" dataKey="count" stroke="var(--lb-red)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FOH vs BOH */}
      <div className="rounded-xl border p-4" style={{ background: "var(--lb-surface)", borderColor: "var(--lb-border)" }}>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--lb-text-soft)" }}>FOH vs BOH — Today</div>
        <div className="flex items-center gap-3">
          <div className="h-20 w-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.byDepartment} dataKey="value" nameKey="name" innerRadius={22} outerRadius={36} paddingAngle={2}>
                  {data.byDepartment.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 text-xs">
            {data.byDepartment.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5" style={{ color: "var(--lb-text)" }}>
                <span className="h-2 w-2 rounded-full" style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                {d.name}: {d.value}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
