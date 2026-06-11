"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export type CalendarKind = "task" | "maintenance" | "checklist";

export type CalendarItem = {
  id: string;
  title: string;
  dueAt: string; // ISO
  color: string; // hex background
  href: string;
  kind: CalendarKind;
  hint?: string; // tooltip suffix (e.g. status / assignee)
};

const KIND_ICON: Record<CalendarKind, string> = {
  task: "",
  maintenance: "🔧 ",
  checklist: "📋 ",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function CalendarClient({
  month,
  items,
  legend,
}: {
  month: string;
  items: CalendarItem[];
  legend: { label: string; color: string }[];
}) {
  const router = useRouter();
  const [year, month1] = month.split("-").map(Number);
  const monthIndex = month1 - 1;

  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const today = new Date();
  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === monthIndex && today.getDate() === d;

  // Bucket items by local day-of-month (only those inside this month).
  const byDay = new Map<number, CalendarItem[]>();
  for (const it of items) {
    const dt = new Date(it.dueAt);
    if (dt.getFullYear() === year && dt.getMonth() === monthIndex) {
      const arr = byDay.get(dt.getDate()) ?? [];
      arr.push(it);
      byDay.set(dt.getDate(), arr);
    }
  }

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const go = (delta: number) => router.push(`/calendar?month=${shiftMonth(month, delta)}`);
  const goToday = () => {
    const t = new Date();
    router.push(`/calendar?month=${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="space-y-4">
      {/* Header / nav */}
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold tracking-tight text-[#140516]">
          {MONTHS[monthIndex]} {year}
        </h1>
        <div className="flex items-center gap-1.5">
          <button onClick={() => go(-1)} aria-label="Previous month" className="rounded-lg border border-[#E4DDE4] px-3 py-1.5 text-sm text-[#726973] hover:bg-[#F0EBF0]">‹</button>
          <button onClick={goToday} className="rounded-lg border border-[#E4DDE4] px-3 py-1.5 text-sm font-medium text-[#440E48] hover:bg-[#F0EBF0]">Today</button>
          <button onClick={() => go(1)} aria-label="Next month" className="rounded-lg border border-[#E4DDE4] px-3 py-1.5 text-sm text-[#726973] hover:bg-[#F0EBF0]">›</button>
        </div>
      </div>

      <div className="m-card overflow-x-auto p-4">
        <div className="min-w-[680px]">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[#726973]">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const dayItems = byDay.get(d) ?? [];
              return (
                <div
                  key={i}
                  className={`min-h-[104px] rounded-lg border p-1.5 ${
                    isToday(d) ? "border-[#440E48] bg-[#FAF6FA]" : "border-[#EEEAEE]"
                  }`}
                >
                  <div className={`mb-1 text-xs font-semibold ${isToday(d) ? "text-[#440E48]" : "text-[#726973]"}`}>
                    {d}
                  </div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 4).map((it) => (
                      <Link
                        key={it.id}
                        href={it.href}
                        title={`${KIND_ICON[it.kind]}${it.title}${it.hint ? " · " + it.hint : ""}`}
                        className="block truncate rounded px-1 py-0.5 text-[10px] font-semibold text-white hover:brightness-110"
                        style={{ backgroundColor: it.color }}
                      >
                        {KIND_ICON[it.kind]}{it.title}
                      </Link>
                    ))}
                    {dayItems.length > 4 && (
                      <div className="text-[10px] text-[#A19BA2]">+{dayItems.length - 4} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#726973]">
        {legend.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">🔧 Maintenance</span>
        <span className="inline-flex items-center gap-1">📋 Checklist</span>
      </div>
    </div>
  );
}
