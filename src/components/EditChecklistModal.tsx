"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Frequency, Priority } from "@prisma/client";
import { updateChecklistTemplate } from "@/lib/checklists";
import { FREQUENCY_LABEL, PRIORITY_LABEL, WEEK_DAYS } from "@/lib/labels";

type LocationOpt = { id: string; name: string };
type Template = {
  id: string;
  name: string;
  frequency: Frequency;
  items: string[];
  locationId: string | null;
  autoGenerateHour: number;
  weekDay: number | null;
  monthDay: number | null;
  priority: Priority;
  department: string | null;
  proofRequired: boolean;
};

export function EditChecklistModal({ template, locations }: { template: Template; locations: LocationOpt[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(template.name);
  const [frequency, setFrequency] = useState<Frequency>(template.frequency);
  const [itemsText, setItemsText] = useState(template.items.join("\n"));
  const [locationId, setLocationId] = useState(template.locationId ?? "");
  const [autoGenerateHour, setAutoGenerateHour] = useState(template.autoGenerateHour);
  const [weekDay, setWeekDay] = useState(template.weekDay ?? 1);
  const [monthDay, setMonthDay] = useState(template.monthDay ?? 1);
  const [priority, setPriority] = useState<Priority>(template.priority);
  const [department, setDepartment] = useState(template.department ?? "");
  const [proofRequired, setProofRequired] = useState(template.proofRequired);

  function submit() {
    setError(null);
    const items = itemsText.split("\n").map((s) => s.trim()).filter(Boolean);
    startTransition(async () => {
      const res = await updateChecklistTemplate(template.id, {
        name, frequency, items,
        locationId: locationId || undefined,
        autoGenerateHour,
        weekDay: frequency === "WEEKLY" ? weekDay : undefined,
        monthDay: frequency === "MONTHLY" ? monthDay : undefined,
        priority, department, proofRequired,
      });
      if (!res.ok) { setError(res.error ?? "Failed"); return; }
      setOpen(false);
      router.refresh();
    });
  }

  const field = "w-full rounded-md border border-[#E4DDE4] px-3 py-2 text-sm outline-none focus:border-[#440E48]";
  const label = "mb-1 block text-xs font-semibold text-[#726973]";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border border-[#E4DDE4] px-2.5 py-1.5 text-xs font-semibold text-[#440E48] hover:bg-[#FAF6FA]"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
        </svg>
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between border-b border-[#E4DDE4] bg-white px-5 py-3.5">
              <h2 className="text-base font-bold text-[#140516]">Edit checklist template</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-md p-1.5 text-[#726973] hover:bg-[#F0EBF0]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <p className={label}>Template name *</p>
                <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div>
                <p className={label}>Checklist items * (one per line)</p>
                <textarea className={field} rows={6} value={itemsText} onChange={(e) => setItemsText(e.target.value)} />
                <p className="mt-1 text-xs text-[#A19BA2]">Each line becomes a separate task when generated.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={label}>Frequency</p>
                  <select className={field} value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
                    {Object.entries(FREQUENCY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <p className={label}>Auto-generate hour (UTC 0–23)</p>
                  <input type="number" min={0} max={23} className={field} value={autoGenerateHour} onChange={(e) => setAutoGenerateHour(Number(e.target.value))} />
                </div>
              </div>

              {frequency === "WEEKLY" && (
                <div>
                  <p className={label}>Day of week</p>
                  <select className={field} value={weekDay} onChange={(e) => setWeekDay(Number(e.target.value))}>
                    {WEEK_DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              )}
              {frequency === "MONTHLY" && (
                <div>
                  <p className={label}>Day of month (1–28)</p>
                  <input type="number" min={1} max={28} className={field} value={monthDay} onChange={(e) => setMonthDay(Number(e.target.value))} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={label}>Location (blank = all)</p>
                  <select className={field} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                    <option value="">— All locations —</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <p className={label}>Priority</p>
                  <select className={field} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                    {Object.entries(PRIORITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <p className={label}>Department</p>
                <input className={field} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Operations" />
              </div>

              <label className="flex items-center gap-2 text-sm text-[#433745]">
                <input type="checkbox" checked={proofRequired} onChange={(e) => setProofRequired(e.target.checked)} />
                Require photo proof before tasks can be completed
              </label>

              {error && <p className="text-sm font-medium text-[#e2445c]">{error}</p>}
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-[#E4DDE4] bg-white px-5 py-3">
              <button onClick={() => setOpen(false)} className="text-sm font-medium text-[#726973] hover:text-[#140516]">Cancel</button>
              <button onClick={submit} disabled={pending}
                className="rounded-lg bg-[#440E48] px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
                {pending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
