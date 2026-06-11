"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLocation, updateLocation } from "@/lib/locations";

export type LocationRow = {
  id: string;
  name: string;
  address: string | null;
  region: string | null;
  userCount: number;
  taskCount: number;
};

const field =
  "w-full rounded-xl border border-[#E4DDE4] bg-white px-3 py-2 text-sm text-[#140516] placeholder-[#A19BA2] outline-none transition focus:border-[#440E48] focus:ring-2 focus:ring-[#440E48]/10";

export function LocationsManager({ locations }: { locations: LocationRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  // Add form
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [region, setRegion] = useState("");

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editErr, setEditErr] = useState<string | null>(null);

  const submit = () =>
    startTransition(async () => {
      setErr(null);
      const res = await createLocation({ name, address: address || undefined, region: region || undefined });
      if (!res.ok) { setErr(res.error); return; }
      setName(""); setAddress(""); setRegion("");
      router.refresh();
    });

  const startEdit = (loc: LocationRow) => {
    setEditId(loc.id);
    setEditName(loc.name);
    setEditAddress(loc.address ?? "");
    setEditRegion(loc.region ?? "");
    setEditErr(null);
  };

  const saveEdit = () =>
    startTransition(async () => {
      if (!editId) return;
      setEditErr(null);
      const res = await updateLocation({ id: editId, name: editName, address: editAddress || undefined, region: editRegion || undefined });
      if (!res.ok) { setEditErr(res.error); return; }
      setEditId(null);
      router.refresh();
    });

  return (
    <div className="space-y-5">
      {/* Add form */}
      <div className="m-card p-5">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#726973]">Add Branch</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input className={field} placeholder="Branch name *" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={field} placeholder="Address (optional)" value={address} onChange={(e) => setAddress(e.target.value)} />
          <input className={field} placeholder="Region (optional)" value={region} onChange={(e) => setRegion(e.target.value)} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={submit}
            disabled={pending || !name.trim()}
            className="m-btn disabled:opacity-60"
          >
            {pending ? "Saving…" : "Add Branch"}
          </button>
          {err && <span className="text-sm font-medium text-[#943B13]">{err}</span>}
        </div>
      </div>

      {/* Branches list */}
      <div className="m-card overflow-x-auto">
        <table className="w-full min-w-[540px] text-sm">
          <thead className="border-b border-[#E4DDE4] bg-[#F9F6F9] text-left text-xs font-semibold uppercase tracking-wider text-[#726973]">
            <tr>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Region</th>
              <th className="px-4 py-3 text-center">Staff</th>
              <th className="px-4 py-3 text-center">Tasks</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EBF0]">
            {locations.map((loc) =>
              editId === loc.id ? (
                <tr key={loc.id} className="bg-[#FAF6FA]">
                  <td className="px-4 py-2">
                    <input
                      className={field}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input className={field} value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Address" />
                  </td>
                  <td className="px-4 py-2">
                    <input className={field} value={editRegion} onChange={(e) => setEditRegion(e.target.value)} placeholder="Region" />
                  </td>
                  <td colSpan={2} className="px-4 py-2">
                    {editErr && <span className="text-xs text-[#943B13]">{editErr}</span>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={saveEdit}
                        disabled={pending || !editName.trim()}
                        className="rounded-lg bg-[#440E48] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5A1560] disabled:opacity-60"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="rounded-lg border border-[#E4DDE4] px-3 py-1.5 text-xs font-medium text-[#726973] hover:bg-[#F0EBF0]"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={loc.id} className="hover:bg-[#F9F6F9]">
                  <td className="px-4 py-3 font-semibold text-[#140516]">{loc.name}</td>
                  <td className="px-4 py-3 text-[#726973]">{loc.address ?? "—"}</td>
                  <td className="px-4 py-3 text-[#726973]">{loc.region ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#F4A626]/15 px-2 text-xs font-semibold text-[#9F4000]">
                      {loc.userCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#440E48]/10 px-2 text-xs font-semibold text-[#440E48]">
                      {loc.taskCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => startEdit(loc)}
                      className="text-xs font-medium text-[#726973] hover:text-[#440E48]"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              )
            )}
            {locations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#A19BA2]">
                  No branches yet — add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
