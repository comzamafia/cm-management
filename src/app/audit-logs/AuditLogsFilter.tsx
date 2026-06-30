"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type UserOpt = { id: string; name: string };
type LocationOpt = { id: string; name: string };

const ACTION_GROUPS: Record<string, string> = {
  "": "All Activities",
  task: "Tasks",
  user: "Users",
  compliance: "Compliance",
  maintenance: "Maintenance",
  project: "Projects",
  announcement: "Announcements",
  inventory: "Inventory",
  category: "Categories",
  checklist: "Checklists",
};

export function AuditLogsFilter({
  users,
  locations,
}: {
  users: UserOpt[];
  locations: LocationOpt[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const set = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      router.push(`/audit-logs?${next.toString()}`);
    },
    [params, router],
  );

  const val = (key: string) => params.get(key) ?? "";

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* User filter */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">User</label>
        <select
          value={val("userId")}
          onChange={(e) => set("userId", e.target.value)}
          className="rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm text-[#140516] outline-none focus:border-[#440E48]"
        >
          <option value="">All Users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      {/* Action group filter */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">Category</label>
        <select
          value={val("group")}
          onChange={(e) => set("group", e.target.value)}
          className="rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm text-[#140516] outline-none focus:border-[#440E48]"
        >
          {Object.entries(ACTION_GROUPS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>

      {/* Location filter */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">Location</label>
        <select
          value={val("locationId")}
          onChange={(e) => set("locationId", e.target.value)}
          className="rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm text-[#140516] outline-none focus:border-[#440E48]"
        >
          <option value="">All Locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      {/* Date range */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">From</label>
        <input
          type="date"
          value={val("from")}
          onChange={(e) => set("from", e.target.value)}
          className="rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm text-[#140516] outline-none focus:border-[#440E48]"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">To</label>
        <input
          type="date"
          value={val("to")}
          onChange={(e) => set("to", e.target.value)}
          className="rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm text-[#140516] outline-none focus:border-[#440E48]"
        />
      </div>

      {/* Clear */}
      {(val("userId") || val("group") || val("locationId") || val("from") || val("to")) && (
        <button
          onClick={() => router.push("/audit-logs")}
          className="rounded-lg border border-[#E4DDE4] px-3 py-2 text-sm text-[#726973] hover:bg-[#FAF6FA]"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
