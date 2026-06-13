"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ComplianceCategory, ComplianceInterval, Priority } from "@prisma/client";
import { createComplianceSchedule } from "@/lib/compliance";
import {
  COMPLIANCE_CATEGORY_LABEL,
  COMPLIANCE_INTERVAL_LABEL,
  PRIORITY_LABEL,
} from "@/lib/labels";

type Opt = { id: string; name: string };

const CATEGORIES = Object.keys(COMPLIANCE_CATEGORY_LABEL) as ComplianceCategory[];
const INTERVALS = Object.keys(COMPLIANCE_INTERVAL_LABEL) as ComplianceInterval[];
const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function ComplianceForm({
  locations,
  users,
  defaultLocationId,
}: {
  locations: Opt[];
  users: Opt[];
  defaultLocationId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<ComplianceCategory>("PEST_CONTROL");
  const [interval, setInterval] = useState<ComplianceInterval>("QUARTERLY");
  const [locationId, setLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? "");
  const [assigneeId, setAssigneeId] = useState("");
  const [vendor, setVendor] = useState("");
  const [vendorContact, setVendorContact] = useState("");
  const [priority, setPriority] = useState<Priority>("HIGH");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [lastServiceDate, setLastServiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!name.trim()) { setErr("Name is required"); return; }
    if (!locationId) { setErr("Pick a location"); return; }
    startTransition(async () => {
      const res = await createComplianceSchedule({
        name,
        category,
        interval,
        locationId,
        assigneeId: assigneeId || null,
        vendor: vendor || null,
        vendorContact: vendorContact || null,
        priority,
        estimatedCost: estimatedCost === "" ? null : Number(estimatedCost),
        notes: notes || null,
        lastServiceDate: lastServiceDate ? new Date(lastServiceDate).toISOString() : null,
      });
      if (!res.ok) { setErr(res.error ?? "Something went wrong"); return; }
      router.push("/compliance");
      router.refresh();
    });
  };

  return (
    <div className="m-card space-y-4 p-5">
      {err && <div className="rounded-lg border border-[#f3d3d8] bg-[#fdf2f3] px-4 py-2 text-sm font-medium text-[#e2445c]">{err}</div>}

      <Field label="Service name">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Quarterly pest control"
          className="w-full rounded-md border border-[#E4DDE4] px-3 py-2 text-sm outline-none focus:border-[#440E48]" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <Select value={category} onChange={(v) => setCategory(v as ComplianceCategory)}
            options={CATEGORIES.map((c) => ({ value: c, label: COMPLIANCE_CATEGORY_LABEL[c] }))} />
        </Field>
        <Field label="Frequency">
          <Select value={interval} onChange={(v) => setInterval(v as ComplianceInterval)}
            options={INTERVALS.map((i) => ({ value: i, label: COMPLIANCE_INTERVAL_LABEL[i] }))} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location">
          <Select value={locationId} onChange={setLocationId}
            options={locations.map((l) => ({ value: l.id, label: l.name }))} />
        </Field>
        <Field label="Owner (optional)">
          <Select value={assigneeId} onChange={setAssigneeId}
            options={[{ value: "", label: "— Unassigned —" }, ...users.map((u) => ({ value: u.id, label: u.name }))]} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Vendor (optional)">
          <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. PestAway Co."
            className="w-full rounded-md border border-[#E4DDE4] px-3 py-2 text-sm outline-none focus:border-[#440E48]" />
        </Field>
        <Field label="Vendor contact (optional)">
          <input value={vendorContact} onChange={(e) => setVendorContact(e.target.value)} placeholder="Phone / email"
            className="w-full rounded-md border border-[#E4DDE4] px-3 py-2 text-sm outline-none focus:border-[#440E48]" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Priority">
          <Select value={priority} onChange={(v) => setPriority(v as Priority)}
            options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))} />
        </Field>
        <Field label="Est. cost (optional)">
          <input type="number" min={0} step={10} value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} placeholder="—"
            className="w-full rounded-md border border-[#E4DDE4] px-3 py-2 text-sm outline-none focus:border-[#440E48]" />
        </Field>
        <Field label="Last service date">
          <input type="date" value={lastServiceDate} onChange={(e) => setLastServiceDate(e.target.value)}
            className="w-full rounded-md border border-[#E4DDE4] px-3 py-2 text-sm outline-none focus:border-[#440E48]" />
        </Field>
      </div>

      <Field label="Notes (optional)">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Scope, access instructions, etc."
          className="w-full rounded-md border border-[#E4DDE4] px-3 py-2 text-sm outline-none focus:border-[#440E48]" />
      </Field>

      <p className="text-xs text-[#A19BA2]">
        The first task will be scheduled at <strong>last service date + {COMPLIANCE_INTERVAL_LABEL[interval].toLowerCase()}</strong>.
        After each completion the next cycle is created automatically.
      </p>

      <div className="flex gap-2">
        <button onClick={submit} disabled={pending} className="m-btn disabled:opacity-60">
          {pending ? "Creating…" : "Create schedule"}
        </button>
        <button onClick={() => router.push("/compliance")} className="m-btn-ghost">Cancel</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#726973]">{label}</span>
      {children}
    </label>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-[#E4DDE4] bg-white px-3 py-2 text-sm text-[#140516] outline-none focus:border-[#440E48]">
      {options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  );
}
