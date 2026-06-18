"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addNote, deleteNote } from "@/lib/notes";

export type NoteItem = { id: string; body: string; time: string };

export function DashboardNotes({
  day,
  today,
  dayLabel,
  isToday,
  prevDay,
  nextDay,
  notes,
}: {
  day: string;
  today: string;
  dayLabel: string;
  isToday: boolean;
  prevDay: string;
  nextDay: string | null;
  notes: NoteItem[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function goToDay(d: string | null) {
    if (!d) return;
    const next = new URLSearchParams(params.toString());
    next.set("noteDate", d);
    router.push(`/dashboard?${next.toString()}#notes`);
  }

  function add() {
    const body = draft.trim();
    if (!body) return;
    setError(null);
    startTransition(async () => {
      const res = await addNote(body);
      if (!res.ok) { setError(res.error); return; }
      setDraft("");
      router.refresh();
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteNote(id);
      if (!res.ok) { setError(res.error); return; }
      router.refresh();
    });
  }

  return (
    <section id="notes" className="m-card scroll-mt-20 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[#440E48]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
            </svg>
          </span>
          <h2 className="text-base font-bold text-[#140516]">Daily Notes</h2>
          <span className="text-sm text-[#A19BA2]">· log your extra work</span>
        </div>

        {/* Day navigation */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => goToDay(prevDay)} aria-label="Previous day" className="rounded-lg border border-[#E4DDE4] px-2.5 py-1.5 text-sm text-[#726973] hover:bg-[#F0EBF0]">‹</button>
          <input
            type="date"
            value={day}
            max={today}
            onChange={(e) => goToDay(e.target.value || null)}
            className="rounded-lg border border-[#E4DDE4] bg-white px-2 py-1.5 text-xs text-[#140516] outline-none focus:border-[#440E48]"
          />
          <button
            onClick={() => goToDay(nextDay)}
            disabled={!nextDay}
            aria-label="Next day"
            className="rounded-lg border border-[#E4DDE4] px-2.5 py-1.5 text-sm text-[#726973] hover:bg-[#F0EBF0] disabled:opacity-40"
          >›</button>
        </div>
      </div>

      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#A19BA2]">
        {isToday ? `Today · ${dayLabel}` : dayLabel}
      </p>

      {/* Quick add — only for today */}
      {isToday && (
        <div className="mb-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") add(); }}
            rows={2}
            placeholder="What extra task did you do? (e.g. Restocked napkins, helped fix POS printer…)"
            className="w-full resize-none rounded-xl border border-[#E4DDE4] bg-white px-3 py-2 text-sm text-[#140516] placeholder-[#A19BA2] outline-none transition focus:border-[#440E48] focus:ring-2 focus:ring-[#440E48]/10"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-[#A19BA2]">⌘/Ctrl + Enter to save</span>
            <button
              onClick={add}
              disabled={pending || !draft.trim()}
              className="m-btn px-4 py-1.5 text-sm disabled:opacity-50"
            >
              {pending ? "Saving…" : "Add Note"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mb-3 rounded-lg bg-[#FFF0EE] px-3 py-2 text-xs font-medium text-[#943B13]">{error}</p>}

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#E4DDE4] py-8 text-center text-sm text-[#A19BA2]">
          {isToday ? "No notes yet today. Jot down anything extra you handled." : "No notes logged this day."}
        </div>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="group flex items-start gap-3 rounded-lg border border-[#EEEAEE] px-3 py-2.5">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#440E48]" />
              <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-[#433745]">{n.body}</p>
              <span className="shrink-0 text-[11px] text-[#A19BA2]">{n.time}</span>
              <button
                onClick={() => remove(n.id)}
                disabled={pending}
                aria-label="Delete note"
                className="shrink-0 text-[#C9C4C9] opacity-0 transition hover:text-[#e2445c] group-hover:opacity-100 disabled:opacity-30"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
