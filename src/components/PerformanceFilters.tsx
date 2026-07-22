"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Loc = { id: string; name: string };
const CATEGORIES: { value: string; label: string }[] = [
  { value: "", label: "All categories" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "SALES_METRICS", label: "Sales metrics" },
  { value: "CUSTOMER_COMPLAINT", label: "Customer complaint" },
  { value: "ACTION_NEEDED", label: "Action needed" },
];

export function PerformanceFilters({ locations, from, to, locationId, category }: {
  locations: Loc[]; from: string; to: string; locationId: string; category: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [f, setF] = useState({ from, to, locationId, category });

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
          <select value={f.locationId} onChange={(e) => set("locationId", e.target.value)} className={`${field} w-full`}>
            <option value="">All locations</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Category</label>
          <select value={f.category} onChange={(e) => set("category", e.target.value)} className={`${field} w-full`}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <button onClick={apply} className="rounded-lg bg-[#440E48] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a1560]">
          Apply filters
        </button>
      </div>
    </div>
  );
}
