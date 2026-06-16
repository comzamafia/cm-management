"use client";

import { useRouter } from "next/navigation";

type UserOpt = { id: string; name: string };

/** Manager-only: pick a teammate to view their dashboard. "Me" clears the view. */
export function DashboardViewAs({
  users,
  currentId,
  meId,
}: {
  users: UserOpt[];
  currentId: string;
  meId: string;
}) {
  const router = useRouter();
  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#726973" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      <span className="hidden text-[#726973] sm:inline">View:</span>
      <select
        value={currentId}
        onChange={(e) => router.push(e.target.value === meId ? "/dashboard" : `/dashboard?view=${e.target.value}`)}
        className="cursor-pointer border-none bg-transparent font-semibold text-[#140516] outline-none"
      >
        <option value={meId}>Me</option>
        {users.filter((u) => u.id !== meId).map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
    </label>
  );
}
