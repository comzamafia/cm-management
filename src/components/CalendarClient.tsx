"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type CalendarKind = "task" | "maintenance" | "checklist";

export type CalendarItem = {
  id: string;
  title: string;
  dueAt: string; // ISO
  color: string; // hex background
  href: string;
  kind: CalendarKind;
  hint?: string; // tooltip suffix (e.g. status / assignee)
  statusLabel?: string; // human status (e.g. "In Progress")
  assigneeName?: string | null; // who is responsible
};

const KIND_ICON: Record<CalendarKind, string> = {
  task: "",
  maintenance: "🔧 ",
  checklist: "📋 ",
};

const KIND_LABEL: Record<CalendarKind, string> = {
  task: "Task",
  maintenance: "Maintenance",
  checklist: "Checklist",
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
  calUid,
  calToken,
}: {
  month: string;
  items: CalendarItem[];
  legend: { label: string; color: string }[];
  calUid?: string;
  calToken?: string;
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

  const [syncOpen, setSyncOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const syncRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!syncOpen) return;
    const handler = (e: MouseEvent) => {
      if (syncRef.current && !syncRef.current.contains(e.target as Node)) setSyncOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [syncOpen]);

  const subscribeUrl = calUid && calToken
    ? `/api/calendar/ics?uid=${calUid}&tok=${calToken}`
    : null;

  const webcalUrl = subscribeUrl
    ? subscribeUrl.replace(/^https?:/, "webcal:").replace(/^\/api/, `${typeof window !== "undefined" ? window.location.origin : ""}/api`)
    : null;

  const copySubscribe = async () => {
    if (!subscribeUrl) return;
    const full = `${window.location.origin}${subscribeUrl}`;
    await navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Selected day for the detail panel. Defaults to today when viewing the
  // current month; resets whenever the month changes.
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => {
    const t = new Date();
    setSelected(
      t.getFullYear() === year && t.getMonth() === monthIndex ? t.getDate() : null,
    );
  }, [month, year, monthIndex]);

  const selectedItems = selected != null ? byDay.get(selected) ?? [] : [];

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[22px] font-bold tracking-tight text-[#140516]">
          {MONTHS[monthIndex]} {year}
        </h1>
        <div className="flex items-center gap-1.5">
          <button onClick={() => go(-1)} aria-label="Previous month" className="rounded-lg border border-[#E4DDE4] px-3 py-1.5 text-sm text-[#726973] hover:bg-[#F0EBF0]">‹</button>
          <button onClick={goToday} className="rounded-lg border border-[#E4DDE4] px-3 py-1.5 text-sm font-medium text-[#440E48] hover:bg-[#F0EBF0]">Today</button>
          <button onClick={() => go(1)} aria-label="Next month" className="rounded-lg border border-[#E4DDE4] px-3 py-1.5 text-sm text-[#726973] hover:bg-[#F0EBF0]">›</button>

          {/* Outlook / ICS sync */}
          <div className="relative" ref={syncRef}>
            <button
              onClick={() => setSyncOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg border border-[#0078D4] bg-white px-3 py-1.5 text-sm font-semibold text-[#0078D4] hover:bg-[#EFF6FC] active:bg-[#DEECF9]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Sync Outlook
            </button>

            {syncOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-[#E4DDE4] bg-white p-4 shadow-lg">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#726973]">Sync with Outlook Calendar</p>

                {/* Download */}
                <a
                  href="/api/calendar/ics"
                  download="cm-calendar.ics"
                  className="mb-2 flex items-center gap-2 rounded-lg border border-[#E4DDE4] px-3 py-2 text-sm font-medium text-[#140516] hover:bg-[#F0EBF0]"
                  onClick={() => setSyncOpen(false)}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#440E48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download .ics (one-time import)
                </a>

                {/* Subscribe */}
                {webcalUrl && (
                  <a
                    href={webcalUrl}
                    className="mb-2 flex items-center gap-2 rounded-lg border border-[#0078D4] bg-[#EFF6FC] px-3 py-2 text-sm font-medium text-[#0078D4] hover:bg-[#DEECF9]"
                    onClick={() => setSyncOpen(false)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0078D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Open in Outlook (live sync)
                  </a>
                )}

                {/* Copy URL */}
                {subscribeUrl && (
                  <button
                    onClick={copySubscribe}
                    className="flex w-full items-center gap-2 rounded-lg border border-[#E4DDE4] px-3 py-2 text-sm font-medium text-[#726973] hover:bg-[#F0EBF0]"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    {copied ? "Copied!" : "Copy subscription URL"}
                  </button>
                )}

                <p className="mt-3 text-[11px] text-[#A19BA2]">
                  Live sync: In Outlook → Add calendar → From internet → paste the copied URL.
                </p>
              </div>
            )}
          </div>
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
              const isSelected = selected === d;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(d)}
                  aria-pressed={isSelected}
                  className={`min-h-[104px] rounded-lg border p-1.5 text-left transition-shadow hover:border-[#440E48] ${
                    isSelected ? "border-[#440E48] ring-2 ring-[#440E48]/30" : isToday(d) ? "border-[#440E48] bg-[#FAF6FA]" : "border-[#EEEAEE]"
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
                        onClick={(e) => e.stopPropagation()}
                        title={`${KIND_ICON[it.kind]}${it.title}${it.hint ? " · " + it.hint : ""}`}
                        className="block truncate rounded px-1 py-0.5 text-[10px] font-semibold text-white hover:brightness-110"
                        style={{ backgroundColor: it.color }}
                      >
                        {KIND_ICON[it.kind]}{it.title}
                      </Link>
                    ))}
                    {dayItems.length > 4 && (
                      <div className="text-[10px] font-medium text-[#A19BA2]">+{dayItems.length - 4} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day detail panel */}
      {selected != null && (
        <div className="m-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#140516]">
              {new Date(year, monthIndex, selected).toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric",
              })}
            </h2>
            <span className="rounded-full bg-[#f3eef3] px-2.5 py-0.5 text-xs font-semibold text-[#726973]">
              {selectedItems.length} {selectedItems.length === 1 ? "item" : "items"}
            </span>
          </div>
          {selectedItems.length === 0 ? (
            <p className="py-4 text-center text-sm text-[#A19BA2]">Nothing scheduled this day.</p>
          ) : (
            <ul className="space-y-2">
              {selectedItems.map((it) => (
                <li key={it.id}>
                  <Link
                    href={it.href}
                    className="flex items-start gap-3 rounded-lg border border-[#EEEAEE] p-3 transition-colors hover:bg-[#FAF6FA]"
                  >
                    <span className="mt-0.5 h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: it.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-[#140516]">
                        {KIND_ICON[it.kind]}{it.title}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#726973]">
                        <span className="font-medium text-[#A19BA2]">{KIND_LABEL[it.kind]}</span>
                        <span className="inline-flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                          {it.assigneeName ?? "Unassigned"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {new Date(it.dueAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                    {it.statusLabel && (
                      <span className="shrink-0 self-center rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ backgroundColor: it.color }}>
                        {it.statusLabel}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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
