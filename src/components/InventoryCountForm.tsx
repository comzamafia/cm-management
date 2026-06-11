"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitInventoryCount } from "@/lib/inventory";
import { INVENTORY_UNIT_LABEL } from "@/lib/labels";
import type { InventoryUnit } from "@prisma/client";

type Item = {
  id: string;
  name: string;
  unit: InventoryUnit;
  category: string | null;
  currentQty: number;
};

export function InventoryCountForm({
  locationId,
  items,
}: {
  locationId: string;
  items: Item[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [qty, setQty] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    const lines = Object.entries(qty)
      .filter(([, v]) => v.trim() !== "" && !Number.isNaN(Number(v)))
      .map(([itemId, v]) => ({ itemId, countedQty: Number(v) }));
    if (lines.length === 0) {
      setError("Enter at least one quantity");
      return;
    }
    start(async () => {
      const res = await submitInventoryCount({ locationId, note, lines });
      if (!res.ok) return setError(res.error ?? "Failed");
      router.push("/inventory");
      router.refresh();
    });
  }

  // Group by category for easier counting.
  const groups = items.reduce<Record<string, Item[]>>((acc, it) => {
    const k = it.category || "Uncategorized";
    (acc[k] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([cat, list]) => (
        <div key={cat} className="m-card overflow-hidden">
          <div className="border-b border-[#E4DDE4] bg-[#F9F6F9] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#726973]">
            {cat}
          </div>
          <ul className="divide-y divide-[#F0EBF0]">
            {list.map((it) => (
              <li key={it.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-[#140516]">{it.name}</p>
                  <p className="text-xs text-[#A19BA2]">
                    on hand: {it.currentQty} {INVENTORY_UNIT_LABEL[it.unit]}
                  </p>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  value={qty[it.id] ?? ""}
                  onChange={(e) => setQty((q) => ({ ...q, [it.id]: e.target.value }))}
                  placeholder="0"
                  className="w-24 rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-right text-sm outline-none focus:border-[#440E48]"
                />
                <span className="w-12 text-xs text-[#726973]">{INVENTORY_UNIT_LABEL[it.unit]}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <textarea
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="w-full rounded-xl border border-[#E4DDE4] bg-white px-3 py-2 text-sm outline-none focus:border-[#440E48]"
      />

      {error && <p className="text-sm font-medium text-[#943B13]">{error}</p>}

      <button
        onClick={submit}
        disabled={pending}
        className="w-full rounded-xl bg-[#440E48] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#5A1560] disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit count"}
      </button>
    </div>
  );
}
