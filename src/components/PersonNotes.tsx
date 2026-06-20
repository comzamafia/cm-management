"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NoteColor } from "@prisma/client";
import { addPersonNote, deletePersonNote, type PersonNoteItem } from "@/lib/person-notes";
import { formatDateTime } from "@/lib/labels";

const NOTE_STYLE: Record<NoteColor, { bg: string; border: string; swatch: string }> = {
  YELLOW: { bg: "#FEF7DA", border: "#F2DE8A", swatch: "#F4CE3A" },
  PINK: { bg: "#FBE4E8", border: "#F2BDC6", swatch: "#E8718A" },
  GREEN: { bg: "#DEF6E4", border: "#A9E2B8", swatch: "#46BE6B" },
  BLUE: { bg: "#E3EEFB", border: "#B4D2F1", swatch: "#5B8DD9" },
  PURPLE: { bg: "#ECE5F4", border: "#CDB8E6", swatch: "#7C3AED" },
};
const COLORS = Object.keys(NOTE_STYLE) as NoteColor[];

type Props = {
  subjectId: string;
  notes: PersonNoteItem[];
  currentUserId: string;
  canDeleteAny: boolean;
};

export function PersonNotes({ subjectId, notes, currentUserId, canDeleteAny }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [color, setColor] = useState<NoteColor>("YELLOW");
  const [err, setErr] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const submit = () =>
    startTransition(async () => {
      const res = await addPersonNote(subjectId, { title, body, color });
      if (!res.ok) { setErr(res.error ?? "Failed"); return; }
      setTitle(""); setBody(""); setColor("YELLOW"); setErr(null); setShowForm(false);
      router.refresh();
    });

  const remove = (id: string) =>
    startTransition(async () => {
      await deletePersonNote(id);
      setMenuOpen(null);
      router.refresh();
    });

  return (
    <section className="rounded-2xl border border-[#E4DDE4] bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[#140516]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#440E48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5z" /><path d="M15 3v6h6" />
          </svg>
          Sticky Notes
        </h2>
        <button
          onClick={() => { setShowForm((v) => !v); setErr(null); }}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#440E48] hover:bg-[#FAF6FA]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Note
        </button>
      </div>

      {/* Compose form */}
      {showForm && (
        <div className="mb-4 rounded-xl border border-[#E4DDE4] p-3" style={{ backgroundColor: NOTE_STYLE[color].bg }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full bg-transparent text-sm font-bold text-[#1F2937] placeholder:text-[#9CA3AF] outline-none"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a note…"
            rows={3}
            className="mt-1 w-full resize-y bg-transparent text-sm text-[#374151] placeholder:text-[#9CA3AF] outline-none"
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submit(); }}
          />
          <div className="mt-2 flex items-center justify-between">
            {/* Color picker */}
            <div className="flex items-center gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className={`h-5 w-5 rounded-full border-2 ${color === c ? "border-[#440E48]" : "border-white"}`}
                  style={{ backgroundColor: NOTE_STYLE[c].swatch }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {err && <span className="text-xs font-medium text-[#e2445c]">{err}</span>}
              <button onClick={() => setShowForm(false)} className="text-xs font-medium text-[#726973] hover:text-[#140516]">Cancel</button>
              <button
                onClick={submit}
                disabled={pending || !body.trim()}
                className="rounded-md bg-[#440E48] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {notes.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#A19BA2]">No notes yet. Click &quot;New Note&quot; to add one.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => {
            const st = NOTE_STYLE[n.color];
            const canDelete = canDeleteAny || n.author.id === currentUserId;
            return (
              <div key={n.id} className="relative rounded-xl border p-3.5" style={{ backgroundColor: st.bg, borderColor: st.border }}>
                <div className="flex items-start justify-between gap-2">
                  {n.title && <h3 className="text-sm font-bold text-[#1F2937]">{n.title}</h3>}
                  {canDelete && (
                    <div className="relative ml-auto shrink-0">
                      <button
                        onClick={() => setMenuOpen(menuOpen === n.id ? null : n.id)}
                        aria-label="Note actions"
                        className="rounded p-0.5 text-[#6B7280] hover:bg-black/5"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" /></svg>
                      </button>
                      {menuOpen === n.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-0 top-full z-20 mt-1 w-28 overflow-hidden rounded-lg border border-[#E4DDE4] bg-white shadow-lg">
                            <button
                              onClick={() => remove(n.id)}
                              disabled={pending}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-[#e2445c] hover:bg-[#fdf2f3]"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-[#374151]">{n.body}</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-[#6B7280]">
                  <span className="font-medium">— {n.author.name}</span>
                  <span>{formatDateTime(n.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
