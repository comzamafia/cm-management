"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { LogCategory, LogDepartment } from "@prisma/client";
import { createLogEntry, getItemTagSuggestions } from "@/lib/logbook";
import { FileDropzone } from "@/components/FileDropzone";

const CATEGORY_OPTS: { value: LogCategory; label: string }[] = [
  { value: "OPERATIONS", label: "Operations" },
  { value: "SALES_METRICS", label: "Sales / Metrics" },
  { value: "CUSTOMER_COMPLAINT", label: "Customer Complaint" },
  { value: "ACTION_NEEDED", label: "Action Needed" },
];

type LocationOpt = { id: string; name: string };

export function NewEntryForm({
  locations,
  defaultLocationId,
  onCreated,
  onClose,
}: {
  locations: LocationOpt[];
  defaultLocationId: string | null;
  onCreated: () => void;
  onClose?: () => void;
}) {
  const [locationId, setLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? "");
  const [category, setCategory] = useState<LogCategory>("OPERATIONS");
  const [department, setDepartment] = useState<LogDepartment>("FOH");
  const [body, setBody] = useState("");
  const [itemTag, setItemTag] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!itemTag.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await getItemTagSuggestions(itemTag);
      setSuggestions(res);
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [itemTag]);

  function submit() {
    setError(null);
    if (!locationId) { setError("Select a location"); return; }
    if (!body.trim()) { setError("Entry cannot be empty"); return; }
    startTransition(async () => {
      const res = await createLogEntry({
        locationId,
        category,
        department,
        body,
        itemTag: itemTag.trim() || undefined,
        photoUrls,
      });
      if (!res.ok) { setError(res.error ?? "Something went wrong"); return; }
      setBody("");
      setItemTag("");
      setPhotoUrls([]);
      onCreated();
    });
  }

  const inputCls = "w-full rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm text-[#140516] outline-none focus:border-[#440E48]";
  const labelCls = "mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]";

  return (
    <div className="m-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-[#140516]">New log entry</h3>
        {onClose && (
          <button onClick={onClose} className="text-xs font-semibold text-[#A19BA2] hover:text-[#726973]">Close ✕</button>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-[#f3d3d8] bg-[#fdf2f3] px-3 py-2 text-xs font-medium text-[#e2445c]">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Location</label>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={inputCls}>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as LogCategory)} className={inputCls}>
            {CATEGORY_OPTS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Department</label>
          <div className="flex gap-2">
            {(["FOH", "BOH"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDepartment(d)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  department === d ? "border-[#440E48] bg-[#440E48] text-white" : "border-[#E4DDE4] bg-white text-[#726973] hover:bg-[#FAF6FA]"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <label className={labelCls}>Dish / Ingredient (optional)</label>
          <input
            value={itemTag}
            onChange={(e) => setItemTag(e.target.value)}
            placeholder="e.g. Pad Kee Mao"
            className={inputCls}
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-[#E4DDE4] bg-white shadow-lg">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setItemTag(s); setSuggestions([]); }}
                  className="block w-full px-3 py-1.5 text-left text-xs text-[#140516] hover:bg-[#FAF6FA]"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <label className={labelCls}>Entry</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="What happened?"
          className={inputCls}
        />
      </div>

      <div className="mt-3">
        <label className={labelCls}>Photos (optional)</label>
        <FileDropzone value={photoUrls} onChange={setPhotoUrls} folder="logbook" kind="image" compact />
      </div>

      <button
        onClick={submit}
        disabled={busy}
        className="mt-4 w-full rounded-lg bg-[#440E48] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#5a1560] disabled:opacity-60"
      >
        {busy ? "Saving…" : "Submit entry"}
      </button>
    </div>
  );
}
