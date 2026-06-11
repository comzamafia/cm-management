"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Priority } from "@prisma/client";
import { PRIORITY_LABEL } from "@/lib/labels";

type Option = { id: string; name: string };

export function TaskFilters({
  assignees,
  categories,
  showAssignee,
  showMine,
}: {
  assignees: Option[];
  categories: Option[];
  showAssignee: boolean;
  showMine: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const mine = params.get("mine") === "1";
  const assigneeId = params.get("assigneeId") ?? "";
  const priority = params.get("priority") ?? "";
  const categoryId = params.get("categoryId") ?? "";

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    // "My tasks" and a specific assignee are mutually exclusive.
    if (key === "mine" && value) next.delete("assigneeId");
    if (key === "assigneeId" && value) next.delete("mine");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const hasAny = mine || assigneeId || priority || categoryId;

  const select =
    "rounded-lg border border-[#E4DDE4] bg-white px-3 py-1.5 text-sm text-[#140516] outline-none transition focus:border-[#440E48]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showMine && (
        <button
          onClick={() => setParam("mine", mine ? "" : "1")}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            mine ? "bg-[#440E48] text-white shadow-sm" : "bg-white text-[#726973] ring-1 ring-inset ring-[#E4DDE4] hover:bg-[#F0EBF0]"
          }`}
        >
          My Tasks
        </button>
      )}

      {showAssignee && (
        <select value={assigneeId} onChange={(e) => setParam("assigneeId", e.target.value)} className={select}>
          <option value="">All assignees</option>
          {assignees.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}

      <select value={priority} onChange={(e) => setParam("priority", e.target.value)} className={select}>
        <option value="">All priorities</option>
        {Object.values(Priority).map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABEL[p]}
          </option>
        ))}
      </select>

      {categories.length > 0 && (
        <select value={categoryId} onChange={(e) => setParam("categoryId", e.target.value)} className={select}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {hasAny && (
        <button
          onClick={() => {
            const next = new URLSearchParams(params.toString());
            ["mine", "assigneeId", "priority", "categoryId"].forEach((k) => next.delete(k));
            const qs = next.toString();
            router.push(qs ? `${pathname}?${qs}` : pathname);
          }}
          className="text-sm text-[#726973] hover:text-[#440E48] hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}
