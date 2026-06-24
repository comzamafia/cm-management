"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { addPerson, updatePerson, setPersonStatus, resetPersonPassword } from "@/lib/people";
import { ROLE_LABEL } from "@/lib/labels";
import { LocationsManager, type LocationRow } from "./LocationsManager";

type Person = {
  id: string;
  name: string;
  email: string;
  role: Role;
  locationId: string | null;
  phone: string | null;
  status: string;
  locationName: string | null;
};
type LocationOpt = { id: string; name: string };

const ROLE_HEX: Record<Role, string> = {
  OWNER: "#440E48",
  AREA_MANAGER: "#9F4000",
  STORE_MANAGER: "#1DBA87",
  SHIFT_LEAD: "#F4A626",
  EMPLOYEE: "#726973",
  NEW_HIRE: "#A19BA2",
  COMPLIANCE: "#0D9488",
};

const field =
  "w-full rounded-xl border border-[#E4DDE4] bg-white px-3 py-2 text-sm text-[#140516] placeholder-[#A19BA2] outline-none transition focus:border-[#440E48] focus:ring-2 focus:ring-[#440E48]/10";

export function PeopleManager({
  people,
  locations,
  locationRows,
  currentUserId,
}: {
  people: Person[];
  locations: LocationOpt[];
  locationRows: LocationRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"team" | "branches">("team");

  // Add form
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("EMPLOYEE");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");

  // Edit modal
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [editErr, setEditErr] = useState<string | null>(null);

  // Reset password modal
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetName, setResetName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetErr, setResetErr] = useState<string | null>(null);
  const [resetOk, setResetOk] = useState(false);

  const submit = () =>
    startTransition(async () => {
      setErr(null);
      const res = await addPerson({ name, email, role, locationId: locationId || null });
      if (!res.ok) { setErr(res.error ?? "Failed"); return; }
      setErr(null); setName(""); setEmail(""); router.refresh();
    });

  const toggle = (id: string, status: string) =>
    startTransition(async () => {
      await setPersonStatus(id, status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
      router.refresh();
    });

  const openEdit = (p: Person) => { setEditPerson({ ...p }); setEditErr(null); };
  const closeEdit = () => { setEditPerson(null); setEditErr(null); };

  const saveEdit = () =>
    startTransition(async () => {
      if (!editPerson) return;
      setEditErr(null);
      const res = await updatePerson({
        id: editPerson.id,
        name: editPerson.name,
        email: editPerson.email,
        role: editPerson.role,
        locationId: editPerson.locationId,
        phone: editPerson.phone,
      });
      if (!res.ok) { setEditErr(res.error); return; }
      closeEdit(); router.refresh();
    });

  const openReset = (p: Person) => {
    setResetId(p.id); setResetName(p.name);
    setNewPassword(""); setResetErr(null); setResetOk(false);
  };

  const doReset = () =>
    startTransition(async () => {
      if (!resetId) return;
      setResetErr(null);
      const res = await resetPersonPassword(resetId, newPassword);
      if (!res.ok) { setResetErr(res.error); return; }
      setResetOk(true);
    });

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-[#F0EBF0] p-1">
        {(["team", "branches"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
              tab === t
                ? "bg-white text-[#440E48] shadow-sm"
                : "text-[#726973] hover:text-[#440E48]"
            }`}
          >
            {t === "team" ? "Team Members" : "Branches"}
          </button>
        ))}
      </div>

      {tab === "team" && (
        <>
          {/* Add person */}
          <div className="m-card p-5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#726973]">Add team member</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input className={field} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
              <input className={field} placeholder="email@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <select className={field} value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {Object.entries(ROLE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <select className={field} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">— No location —</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button onClick={submit} disabled={pending || !name.trim() || !email.trim()} className="m-btn disabled:opacity-60">
                {pending ? "Saving…" : "Add member"}
              </button>
              {err && <span className="text-sm font-medium text-[#943B13]">{err}</span>}
            </div>
          </div>

          {/* People list */}
          <div className="m-card overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b border-[#E4DDE4] bg-[#F9F6F9] text-left text-xs font-semibold uppercase tracking-wider text-[#726973]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBF0]">
                {people.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F9F6F9]">
                    <td className="px-4 py-3 font-semibold text-[#140516]">{p.name}</td>
                    <td className="px-4 py-3 text-[#726973]">{p.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                        style={{ backgroundColor: ROLE_HEX[p.role] }}
                      >
                        {ROLE_LABEL[p.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#726973]">{p.locationName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={p.status === "ACTIVE" ? "text-[#1DBA87]" : "text-[#A19BA2]"}>
                        {p.status === "ACTIVE" ? "● Active" : "○ Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => openEdit(p)} className="text-xs font-medium text-[#726973] hover:text-[#440E48]">
                          Edit
                        </button>
                        <button onClick={() => openReset(p)} className="text-xs font-medium text-[#726973] hover:text-[#9F4000]">
                          Password
                        </button>
                        {p.id !== currentUserId && (
                          <button onClick={() => toggle(p.id, p.status)} className="text-xs font-medium text-[#726973] hover:text-[#943B13]">
                            {p.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "branches" && <LocationsManager locations={locationRows} />}

      {/* Edit modal */}
      {editPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="h-[2px] bg-gradient-to-r from-[#9F4000] via-[#F4A626] to-[#9F4000]" />
            <div className="p-6">
              <h3 className="mb-5 text-base font-bold text-[#140516]">Edit Team Member</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#726973]">Name</label>
                  <input className={field} value={editPerson.name} onChange={(e) => setEditPerson({ ...editPerson, name: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#726973]">Email</label>
                  <input type="email" className={field} value={editPerson.email} onChange={(e) => setEditPerson({ ...editPerson, email: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#726973]">Phone</label>
                  <input className={field} placeholder="e.g. 416-555-0100" value={editPerson.phone ?? ""} onChange={(e) => setEditPerson({ ...editPerson, phone: e.target.value || null })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#726973]">Role</label>
                  <select className={field} value={editPerson.role} onChange={(e) => setEditPerson({ ...editPerson, role: e.target.value as Role })}>
                    {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#726973]">Branch</label>
                  <select className={field} value={editPerson.locationId ?? ""} onChange={(e) => setEditPerson({ ...editPerson, locationId: e.target.value || null })}>
                    <option value="">— No location —</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
              {editErr && <p className="mt-3 text-sm font-medium text-[#943B13]">{editErr}</p>}
              <div className="mt-5 flex justify-end gap-3">
                <button onClick={closeEdit} className="m-btn-ghost">Cancel</button>
                <button onClick={saveEdit} disabled={pending} className="m-btn disabled:opacity-60">
                  {pending ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="h-[2px] bg-gradient-to-r from-[#9F4000] via-[#F4A626] to-[#9F4000]" />
            <div className="p-6">
              <h3 className="mb-1 text-base font-bold text-[#140516]">Reset Password</h3>
              <p className="mb-4 text-sm text-[#726973]">Set a new password for <strong>{resetName}</strong>.</p>
              {resetOk ? (
                <p className="rounded-xl bg-[#F0FAF7] px-4 py-3 text-sm font-semibold text-[#1DBA87]">
                  Password updated successfully.
                </p>
              ) : (
                <>
                  <input
                    type="text"
                    className={field}
                    placeholder="New password (min. 8 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                  />
                  {resetErr && <p className="mt-2 text-sm font-medium text-[#943B13]">{resetErr}</p>}
                </>
              )}
              <div className="mt-5 flex justify-end gap-3">
                <button onClick={() => setResetId(null)} className="m-btn-ghost">
                  {resetOk ? "Close" : "Cancel"}
                </button>
                {!resetOk && (
                  <button onClick={doReset} disabled={pending || newPassword.length < 8} className="m-btn disabled:opacity-60">
                    {pending ? "Updating…" : "Set Password"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
