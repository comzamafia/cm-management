"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetAndLoadReal } from "@/lib/setup";

export function BoardSetup({ hasMockData }: { hasMockData: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    if (!confirm("This clears all demo/mock data and loads Hang's Monthly Checklist as real data. Continue?")) return;
    startTransition(async () => {
      const res = await resetAndLoadReal();
      if (!res.ok) setErr(res.error ?? "Failed");
      else { setErr(null); router.refresh(); }
    });
  };

  return (
    <div className="m-card mx-auto max-w-xl p-8 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#e6f1fd] text-2xl">🗂️</div>
      <h2 className="text-xl font-bold text-[#323338]">Set up your board</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[#676879]">
        Load <strong>Hang&apos;s Monthly Checklist</strong> — 10 categories (Payroll, Tip Outs,
        Vendor Payments, Reconciliation…) with their tasks and due dates for this month.
        {hasMockData && " This replaces the existing demo data with real data."}
      </p>
      {err && <p className="mt-3 text-sm font-medium text-[#e2445c]">{err}</p>}
      <button onClick={load} disabled={pending} className="m-btn mx-auto mt-5 disabled:opacity-60">
        {pending ? "Setting up…" : "Load Hang's Monthly Checklist"}
      </button>
    </div>
  );
}
