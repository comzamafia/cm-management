"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Loc = { id: string; name: string };

export function OpsFilters({ locations, categories, from, to, locationExtId, category }: {
  locations: Loc[]; categories: string[]; from: string; to: string; locationExtId: string; category: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [f, setF] = useState({ from, to, locationExtId, category });

  const apply = () => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(f)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.push(`/performance-overview?${next.toString()}`);
  };
  const set = (k: keyof typeof f, v: string) => setF((prev) => ({ ...prev, [k]: v }));

  const field = "rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm text-[#140516] outline-none focus:border-[#440E48]";
  const label = "mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]";

  return (
    <div className="m-card p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <div>
          <label className={label}>From</label>
          <input type="date" value={f.from} onChange={(e) => set("from", e.target.value)} className={`${field} w-full`} />
        </div>
        <div>
          <label className={label}>To</label>
          <input type="date" value={f.to} onChange={(e) => set("to", e.target.value)} className={`${field} w-full`} />
        </div>
        <div>
          <label className={label}>Location</label>
          <select value={f.locationExtId} onChange={(e) => set("locationExtId", e.target.value)} className={`${field} w-full`}>
            <option value="">All locations</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Category</label>
          <select value={f.category} onChange={(e) => set("category", e.target.value)} className={`${field} w-full`}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={apply} className="rounded-lg bg-[#440E48] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a1560]">
          Apply filters
        </button>
      </div>
    </div>
  );
}
