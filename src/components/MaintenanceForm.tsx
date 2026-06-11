"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MaintenanceArea, Priority } from "@prisma/client";
import { createMaintenanceRequest } from "@/lib/maintenance";
import { MAINTENANCE_AREA_LABEL, PRIORITY_LABEL } from "@/lib/labels";
import { PhotoUploader } from "./PhotoUploader";

type Loc = { id: string; name: string };

const field =
  "w-full rounded-xl border border-[#E4DDE4] bg-white px-3 py-2.5 text-sm text-[#140516] outline-none transition focus:border-[#440E48] focus:ring-2 focus:ring-[#440E48]/10";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wider text-[#726973]";

export function MaintenanceForm({
  locations,
  canChooseLocation,
}: {
  locations: Loc[];
  canChooseLocation: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState<MaintenanceArea>("EQUIPMENT");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createMaintenanceRequest({
        title,
        description,
        area,
        priority,
        locationId: canChooseLocation ? locationId : undefined,
        photoUrls,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not submit");
        return;
      }
      router.push("/maintenance");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="m-card space-y-4 p-6">
      <div>
        <label className={label}>What needs fixing?</label>
        <input
          className={field}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Walk-in freezer not cooling"
          required
        />
      </div>

      <div>
        <label className={label}>Details (optional)</label>
        <textarea
          className={field}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Where exactly, when it started, anything you tried…"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Area</label>
          <select className={field} value={area} onChange={(e) => setArea(e.target.value as MaintenanceArea)}>
            {Object.values(MaintenanceArea).map((a) => (
              <option key={a} value={a}>
                {MAINTENANCE_AREA_LABEL[a]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Priority</label>
          <select className={field} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {Object.values(Priority).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {canChooseLocation && locations.length > 1 && (
        <div>
          <label className={label}>Location</label>
          <select className={field} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={label}>Photos</label>
        <PhotoUploader value={photoUrls} onChange={setPhotoUrls} disabled={pending} />
      </div>

      {error && <p className="text-sm font-medium text-[#943B13]">{error}</p>}

      <button
        type="submit"
        disabled={pending || !title.trim()}
        className="w-full rounded-xl bg-[#440E48] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#5A1560] disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}
