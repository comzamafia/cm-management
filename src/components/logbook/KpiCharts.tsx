"use client";

import { AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import type { getKpiData } from "@/lib/logbook";

type KpiData = Awaited<ReturnType<typeof getKpiData>>;

const DEPT_COLORS = ["#F4A626", "#1DBA87"];

export function KpiCharts({ data }: { data: KpiData }) {
  const label = "text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]";
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Entries today */}
      <div className="m-card p-4">
        <div className={label}>Entries Today</div>
        <div className="text-3xl font-extrabold text-[#440E48]">{data.totalToday}</div>
        <div className="mt-2 h-14">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.hourly}>
              <Area type="monotone" dataKey="count" stroke="#F4A626" fill="#F4A626" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Complaints trend */}
      <div className="m-card p-4">
        <div className={`mb-2 ${label}`}>Complaints — Last 7 Days</div>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.complaintsByDay}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#A19BA2" }} tickFormatter={(d: string) => d.slice(5)} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E4DDE4", borderRadius: 8, fontSize: 11 }} />
              <Line type="monotone" dataKey="count" stroke="#e2445c" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FOH vs BOH */}
      <div className="m-card p-4">
        <div className={`mb-2 ${label}`}>FOH vs BOH — Today</div>
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
              <div key={d.name} className="flex items-center gap-1.5 text-[#433745]">
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
