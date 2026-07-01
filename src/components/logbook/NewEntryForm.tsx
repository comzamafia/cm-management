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

  const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
  const inputStyle = { background: "var(--lb-surface-2)", borderColor: "var(--lb-border)", color: "var(--lb-text)" };

  return (
    <div className="rounded-xl border p-5" style={{ background: "var(--lb-surface)", borderColor: "var(--lb-border)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold" style={{ color: "var(--lb-text)" }}>New Log Entry</h3>
        {onClose && (
          <button onClick={onClose} className="text-xs" style={{ color: "var(--lb-text-soft)" }}>Close ✕</button>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-lg border px-3 py-2 text-xs font-medium" style={{ borderColor: "var(--lb-red)", color: "var(--lb-red)", background: "color-mix(in srgb, var(--lb-red) 12%, transparent)" }}>
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--lb-text-soft)" }}>Location</label>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={inputCls} style={inputStyle}>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--lb-text-soft)" }}>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as LogCategory)} className={inputCls} style={inputStyle}>
            {CATEGORY_OPTS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--lb-text-soft)" }}>Department</label>
          <div className="flex gap-2">
            {(["FOH", "BOH"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDepartment(d)}
                className="flex-1 rounded-lg border px-3 py-2 text-sm font-semibold"
                style={department === d
                  ? { background: "var(--lb-accent)", borderColor: "var(--lb-accent)", color: "#140516" }
                  : { ...inputStyle }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--lb-text-soft)" }}>Dish / Ingredient (optional)</label>
          <input
            value={itemTag}
            onChange={(e) => setItemTag(e.target.value)}
            placeholder="e.g. Pad Kee Mao"
            className={inputCls}
            style={inputStyle}
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border shadow-lg" style={{ background: "var(--lb-surface-2)", borderColor: "var(--lb-border)" }}>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setItemTag(s); setSuggestions([]); }}
                  className="block w-full px-3 py-1.5 text-left text-xs hover:opacity-80"
                  style={{ color: "var(--lb-text)" }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--lb-text-soft)" }}>Entry</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="What happened?"
          className={inputCls}
          style={inputStyle}
        />
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--lb-text-soft)" }}>Photos (optional)</label>
        <FileDropzone value={photoUrls} onChange={setPhotoUrls} folder="logbook" kind="image" compact />
      </div>

      <button
        onClick={submit}
        disabled={busy}
        className="mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-bold disabled:opacity-60"
        style={{ background: "var(--lb-accent)", color: "#140516" }}
      >
        {busy ? "Saving…" : "Submit Entry"}
      </button>
    </div>
  );
}
