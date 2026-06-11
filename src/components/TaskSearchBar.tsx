"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function TaskSearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(defaultValue);

  function search(value: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (value.trim()) p.set("q", value.trim());
    else p.delete("q");
    router.push(`/tasks?${p.toString()}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        search(q);
      }}
      className="relative"
    >
      <svg
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A19BA2]"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && search(q)}
        placeholder="Search tasks by title or description…"
        className="w-full rounded-xl border border-[#E4DDE4] bg-white py-2 pl-9 pr-10 text-sm text-[#140516] placeholder-[#A19BA2] outline-none transition focus:border-[#440E48] focus:ring-2 focus:ring-[#440E48]/10"
      />
      {q && (
        <button
          type="button"
          onClick={() => { setQ(""); search(""); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A19BA2] hover:text-[#726973]"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </form>
  );
}
