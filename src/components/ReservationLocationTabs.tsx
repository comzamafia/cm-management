"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function ReservationLocationTabs({
  locations,
  selectedLocationId,
}: {
  locations: { id: string; name: string }[];
  selectedLocationId: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function selectLocation(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("locationId", id);
    next.delete("date"); // switching branch resets the date picker to its most recent night
    startTransition(() => router.push(`/reservations?${next.toString()}`));
  }

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Branch">
      {locations.map((l) => {
        const active = l.id === selectedLocationId;
        return (
          <button
            key={l.id}
            role="tab"
            aria-selected={active}
            onClick={() => selectLocation(l.id)}
            disabled={pending}
            className="rounded-lg px-4 py-2 text-sm font-bold transition-colors disabled:opacity-60"
            style={
              active
                ? { background: "var(--rv-navy)", color: "#FFFFFF" }
                : { background: "var(--rv-card)", color: "var(--rv-text-soft)", border: "1px solid var(--rv-border)" }
            }
          >
            CHIANG MAI — {l.name.toUpperCase()}
            {active && <span className="ml-2 text-[10px] font-semibold" style={{ color: "var(--rv-blue)" }}>● VIEWING</span>}
          </button>
        );
      })}
    </div>
  );
}
