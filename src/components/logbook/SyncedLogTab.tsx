"use client";

import { useEffect, useState, useTransition } from "react";
import { getOpsPosts, syncOpsData, type OpsPostRow } from "@/lib/ops-sync";

const SEV_STYLE: Record<string, string> = {
  High: "bg-[#e2445c1a] text-[#e2445c]", Critical: "bg-[#e2445c1a] text-[#e2445c]", Severe: "bg-[#e2445c1a] text-[#e2445c]",
  Medium: "bg-[#F4A6261a] text-[#B45309]", Low: "bg-[#1DBA871a] text-[#1DBA87]",
};
function sentColor(s: string | null) {
  if (!s) return "#A19BA2";
  const v = s.toLowerCase();
  return v.includes("positive") ? "#1DBA87" : v.includes("negative") ? "#e2445c" : "#726973";
}

export function SyncedLogTab() {
  const [locationExtId, setLocationExtId] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof getOpsPosts>>>({ total: 0, page: 1, totalPages: 1, posts: [], categories: [], locations: [] });
  const [busy, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    startTransition(async () => {
      setData(await getOpsPosts({ locationExtId: locationExtId || undefined, category: category || undefined, from: from || undefined, to: to || undefined, page }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationExtId, category, from, to, page, reloadKey]);

  const sync = () => {
    setSyncing(true);
    setMsg(null);
    startTransition(async () => {
      const res = await syncOpsData();
      setSyncing(false);
      setMsg(res.ok ? `Synced ${res.fetched} · ${res.created} new` : (res.error ?? "Sync failed"));
      if (res.ok) { setPage(1); setReloadKey((k) => k + 1); }
    });
  };

  const selCls = "rounded-lg border border-[#E4DDE4] bg-white px-2.5 py-1.5 text-xs text-[#140516] outline-none focus:border-[#440E48]";

  return (
    <div className="space-y-4">
      <div className="m-card flex flex-wrap items-center gap-2 p-3">
        <select value={locationExtId} onChange={(e) => { setLocationExtId(e.target.value); setPage(1); }} className={selCls}>
          <option value="">All locations</option>
          {data.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className={selCls}>
          <option value="">All categories</option>
          {data.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={selCls} />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={selCls} />
        <div className="ml-auto flex items-center gap-2">
          {msg && <span className="text-xs font-medium text-[#726973]">{msg}</span>}
          <button onClick={sync} disabled={syncing} className="rounded-lg bg-[#440E48] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5a1560] disabled:opacity-60">
            {syncing ? "Syncing…" : "↻ Sync"}
          </button>
        </div>
      </div>

      <div className="m-card overflow-hidden">
        <div className="divide-y divide-[#f3eef3]">
          {data.posts.map((e: OpsPostRow) => (
            <div key={e.id} className="px-5 py-3 text-sm transition-colors hover:bg-[#faf8fa]">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#A19BA2]">
                <span className="font-semibold text-[#140516]">{e.locationName}</span>
                <span>· {e.category}</span>
                {e.severity && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${SEV_STYLE[e.severity] ?? "bg-[#F3EEF3] text-[#726973]"}`}>{e.severity}</span>}
                {e.riskScore != null && <span className="font-semibold text-[#726973]">risk {e.riskScore}</span>}
                {e.sentiment && <span className="inline-flex items-center gap-1 font-semibold" style={{ color: sentColor(e.sentiment) }}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: sentColor(e.sentiment) }} />{e.sentiment}</span>}
                {e.followUp && <span className="rounded-full bg-[#e2445c1a] px-1.5 py-0.5 text-[10px] font-bold text-[#e2445c]">follow-up</span>}
              </div>
              <p className="mt-1 text-[#433745]">{e.message}</p>
              <div className="mt-1 text-[11px] text-[#A19BA2]">
                {e.writerName} · {new Date(e.postedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </div>
            </div>
          ))}
          {data.posts.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-[#A19BA2]">
              {busy ? "Loading…" : "No synced posts. Press Sync to pull the latest from the ops platform."}
            </div>
          )}
        </div>
        {data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#f3eef3] px-5 py-3 text-xs text-[#A19BA2]">
            <span>Page {data.page} of {data.totalPages} · {data.total} total</span>
            <div className="flex gap-3">
              {data.page > 1 && <button onClick={() => setPage(data.page - 1)} className="font-semibold text-[#440E48] hover:underline">← Prev</button>}
              {data.page < data.totalPages && <button onClick={() => setPage(data.page + 1)} className="font-semibold text-[#440E48] hover:underline">Next →</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
