"use client";

import { useEffect, useState, useTransition } from "react";
import { LogCategory, LogDepartment } from "@prisma/client";
import { getLogHistory } from "@/lib/logbook";

type LocationOpt = { id: string; name: string };
type HistoryEntry = Awaited<ReturnType<typeof getLogHistory>>["entries"][number];

const CATEGORY_LABEL: Record<LogCategory, string> = {
  OPERATIONS: "Operations",
  SALES_METRICS: "Sales / Metrics",
  CUSTOMER_COMPLAINT: "Complaint",
  ACTION_NEEDED: "Action Needed",
};

const RISK_COLOR: Record<string, string> = { LOW: "var(--lb-text-soft)", MEDIUM: "var(--lb-accent)", HIGH: "var(--lb-red)" };

export function HistoryTab({ locations }: { locations: LocationOpt[] }) {
  const [locationId, setLocationId] = useState("");
  const [category, setCategory] = useState<LogCategory | "">("");
  const [department, setDepartment] = useState<LogDepartment | "">("");
  const [itemTag, setItemTag] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const res = await getLogHistory({
        locationId: locationId || undefined,
        category: category || undefined,
        department: department || undefined,
        itemTag: itemTag || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
      });
      setEntries(res.entries);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, category, department, itemTag, from, to, page]);

  const selCls = "rounded-lg border px-2.5 py-1.5 text-xs outline-none";
  const selStyle = { background: "var(--lb-surface-2)", borderColor: "var(--lb-border)", color: "var(--lb-text)" };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={locationId} onChange={(e) => { setLocationId(e.target.value); setPage(1); }} className={selCls} style={selStyle}>
          <option value="">All Locations</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select value={category} onChange={(e) => { setCategory(e.target.value as LogCategory | ""); setPage(1); }} className={selCls} style={selStyle}>
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={department} onChange={(e) => { setDepartment(e.target.value as LogDepartment | ""); setPage(1); }} className={selCls} style={selStyle}>
          <option value="">FOH / BOH</option>
          <option value="FOH">FOH</option>
          <option value="BOH">BOH</option>
        </select>
        <input value={itemTag} onChange={(e) => { setItemTag(e.target.value); setPage(1); }} placeholder="Dish/ingredient…" className={selCls} style={selStyle} />
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={selCls} style={selStyle} />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={selCls} style={selStyle} />
      </div>

      <div className="rounded-xl border" style={{ background: "var(--lb-surface)", borderColor: "var(--lb-border)" }}>
        <div className="divide-y" style={{ borderColor: "var(--lb-border)" }}>
          {entries.map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--lb-text-soft)" }}>
                  <span className="font-semibold" style={{ color: "var(--lb-text)" }}>{e.location.name}</span>
                  <span>· {CATEGORY_LABEL[e.category]}</span>
                  <span>· {e.department}</span>
                  {e.itemTag && <span className="rounded px-1.5 py-0.5" style={{ background: "var(--lb-surface-2)" }}>{e.itemTag}</span>}
                  {e.aiRiskLevel && <span style={{ color: RISK_COLOR[e.aiRiskLevel] }}>● {e.aiRiskLevel}</span>}
                </div>
                <p className="mt-1" style={{ color: "var(--lb-text)" }}>{e.body}</p>
                <div className="mt-1 text-[11px]" style={{ color: "var(--lb-text-soft)" }}>
                  {e.author.name} · {new Date(e.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--lb-text-soft)" }}>
              {busy ? "Loading…" : "No entries found."}
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-2.5 text-xs" style={{ borderColor: "var(--lb-border)", color: "var(--lb-text-soft)" }}>
            <span>Page {page} of {totalPages} · {total} total</span>
            <div className="flex gap-2">
              {page > 1 && <button onClick={() => setPage(page - 1)} className="hover:underline">← Prev</button>}
              {page < totalPages && <button onClick={() => setPage(page + 1)} className="hover:underline">Next →</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
