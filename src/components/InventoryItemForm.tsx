"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { InventoryUnit } from "@prisma/client";
import { createInventoryItem } from "@/lib/inventory";
import { INVENTORY_UNIT_LABEL } from "@/lib/labels";

type Loc = { id: string; name: string };

const field =
  "w-full rounded-xl border border-[#E4DDE4] bg-white px-3 py-2.5 text-sm text-[#140516] outline-none transition focus:border-[#440E48] focus:ring-2 focus:ring-[#440E48]/10";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wider text-[#726973]";

export function InventoryItemForm({ locations }: { locations: Loc[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState<InventoryUnit>("EACH");
  const [category, setCategory] = useState("");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [parLevel, setParLevel] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createInventoryItem({
        name,
        sku,
        unit,
        category,
        locationId,
        parLevel: parLevel ? Number(parLevel) : null,
        reorderLevel: reorderLevel ? Number(reorderLevel) : null,
      });
      if (!res.ok) return setError(res.error ?? "Failed");
      router.push("/inventory");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="m-card space-y-4 p-6">
      <div>
        <label className={label}>Item name</label>
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jasmine rice" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Unit</label>
          <select className={field} value={unit} onChange={(e) => setUnit(e.target.value as InventoryUnit)}>
            {Object.values(InventoryUnit).map((u) => (
              <option key={u} value={u}>
                {INVENTORY_UNIT_LABEL[u]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Category</label>
          <input className={field} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Dry goods" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Par level (target)</label>
          <input type="number" className={field} value={parLevel} onChange={(e) => setParLevel(e.target.value)} placeholder="optional" />
        </div>
        <div>
          <label className={label}>Reorder at (≤)</label>
          <input type="number" className={field} value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} placeholder="low-stock alert" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>SKU (optional)</label>
          <input className={field} value={sku} onChange={(e) => setSku(e.target.value)} />
        </div>
        {locations.length > 1 && (
          <div>
            <label className={label}>Location</label>
            <select className={field} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && <p className="text-sm font-medium text-[#943B13]">{error}</p>}

      <button
        type="submit"
        disabled={pending || !name.trim() || !locationId}
        className="w-full rounded-xl bg-[#440E48] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#5A1560] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add item"}
      </button>
    </form>
  );
}
