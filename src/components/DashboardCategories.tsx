"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCategory } from "@/lib/categories";

type Cat = { id: string; name: string; color: string; count: number };
const SWATCHES = ["#440E48", "#5B8DD9", "#F4A626", "#1DBA87", "#9F4000", "#A25DDC", "#e2445c", "#726973"];

export function DashboardCategories({ categories, canEdit }: { categories: Cat[]; canEdit: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const add = () => {
    if (!name.trim()) return;
    setPending(true);
    startTransition(async () => {
      const res = await createCategory({ name, color });
      setPending(false);
      if (!res.ok) { setErr(res.error ?? "Could not create"); return; }
      setName(""); setOpen(false); setErr(null);
      router.refresh();
    });
  };

  return (
    <section className="m-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-[#140516]">Task Categories</h3>
        <Link href="/board" className="text-xs font-semibold text-[#440E48] hover:underline">View all</Link>
      </div>

      <ul className="space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
            <span className="flex-1 truncate text-sm text-[#140516]">{c.name}</span>
            <span className="text-sm font-bold text-[#726973]">{c.count}</span>
          </li>
        ))}
        {categories.length === 0 && <li className="py-2 text-sm text-[#A19BA2]">No categories yet.</li>}
      </ul>

      {canEdit && (
        <div className="mt-3 border-t border-[#f3eef3] pt-3">
          {!open ? (
            <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#440E48] hover:underline">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New category
            </button>
          ) : (
            <div className="space-y-2">
              {err && <div className="text-xs font-medium text-[#e2445c]">{err}</div>}
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") add(); if (e.key === "Escape") setOpen(false); }}
                placeholder="Category name"
                className="w-full rounded-md border border-[#E4DDE4] px-2.5 py-1.5 text-sm outline-none focus:border-[#440E48]" />
              <div className="flex items-center gap-1.5">
                {SWATCHES.map((c) => (
                  <button key={c} onClick={() => setColor(c)} aria-label={c}
                    className="h-7 w-7 rounded-full" style={{ backgroundColor: c, outline: color === c ? "2px solid #140516" : "none", outlineOffset: "2px" }} />
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={add} disabled={pending} className="rounded-md bg-[#440E48] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{pending ? "Adding…" : "Add"}</button>
                <button onClick={() => { setOpen(false); setErr(null); }} className="rounded-md border border-[#E4DDE4] px-3 py-1.5 text-xs font-semibold text-[#726973]">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
