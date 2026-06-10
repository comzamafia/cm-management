"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Frequency, Priority } from "@prisma/client";
import { createChecklistTemplate } from "@/lib/checklists";
import { FREQUENCY_LABEL, PRIORITY_LABEL, WEEK_DAYS } from "@/lib/labels";

type LocationOpt = { id: string; name: string };

export function NewChecklistForm({ locations }: { locations: LocationOpt[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("DAILY");
  const [itemsText, setItemsText] = useState("");
  const [locationId, setLocationId] = useState("");
  const [autoGenerateHour, setAutoGenerateHour] = useState(7);
  const [weekDay, setWeekDay] = useState(1);
  const [monthDay, setMonthDay] = useState(1);
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [department, setDepartment] = useState("");
  const [proofRequired, setProofRequired] = useState(false);

  function submit() {
    setError(null);
    const items = itemsText.split("\n").map((s) => s.trim()).filter(Boolean);
    startTransition(async () => {
      const res = await createChecklistTemplate({
        name,
        frequency,
        items,
        locationId: locationId || undefined,
        autoGenerateHour,
        weekDay: frequency === "WEEKLY" ? weekDay : undefined,
        monthDay: frequency === "MONTHLY" ? monthDay : undefined,
        priority,
        department,
        proofRequired,
      });
      if (!res.ok) setError(res.error);
      else router.push("/checklists");
    });
  }

  const field = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
  const label = "mb-1 block text-xs font-medium text-slate-600";

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      <div>
        <p className={label}>Template name *</p>
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Opening Duties" />
      </div>

      <div>
        <p className={label}>Checklist items * (one per line)</p>
        <textarea
          className={field}
          rows={6}
          value={itemsText}
          onChange={(e) => setItemsText(e.target.value)}
          placeholder={"Unlock front door\nTurn on lights\nStart POS system\nCheck refrigerator temp"}
        />
        <p className="mt-1 text-xs text-slate-400">Each line becomes a separate task when generated.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className={label}>Frequency</p>
          <select className={field} value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
            {Object.entries(FREQUENCY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <p className={label}>Auto-generate hour (UTC 0–23)</p>
          <input
            type="number"
            min={0}
            max={23}
            className={field}
            value={autoGenerateHour}
            onChange={(e) => setAutoGenerateHour(Number(e.target.value))}
          />
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
          <input
            type="number"
            min={1}
            max={28}
            className={field}
            value={monthDay}
            onChange={(e) => setMonthDay(Number(e.target.value))}
          />
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
            {Object.entries(PRIORITY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className={label}>Department</p>
        <input className={field} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Operations" />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={proofRequired} onChange={(e) => setProofRequired(e.target.checked)} />
        Require photo proof before tasks can be completed
      </label>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Create Template"}
        </button>
      </div>
    </div>
  );
}
