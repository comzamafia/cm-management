"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { addPerson, setPersonStatus } from "@/lib/people";
import { ROLE_LABEL } from "@/lib/labels";

type Person = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: string;
  locationName: string | null;
};
type LocationOpt = { id: string; name: string };

const ROLE_HEX: Record<Role, string> = {
  OWNER: "#a25ddc",
  AREA_MANAGER: "#0073ea",
  STORE_MANAGER: "#1dba87",
  SHIFT_LEAD: "#00c875",
  EMPLOYEE: "#fdab3d",
  NEW_HIRE: "#9699a6",
};

export function PeopleManager({
  people,
  locations,
  currentUserId,
}: {
  people: Person[];
  locations: LocationOpt[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("EMPLOYEE");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");

  const submit = () =>
    startTransition(async () => {
      const res = await addPerson({ name, email, role, locationId: locationId || null });
      if (!res.ok) setErr(res.error ?? "Failed");
      else { setErr(null); setName(""); setEmail(""); router.refresh(); }
    });

  const toggle = (id: string, status: string) =>
    startTransition(async () => {
      await setPersonStatus(id, status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
      router.refresh();
    });

  const field = "w-full rounded-md border border-[#e6e9ef] px-3 py-2 text-sm outline-none focus:border-[#0073ea]";

  return (
    <div className="space-y-6">
      {/* Add person */}
      <div className="m-card p-5">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#676879]">Add team member</h2>
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
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={submit} disabled={pending || !name.trim() || !email.trim()} className="m-btn disabled:opacity-60">
            {pending ? "Saving…" : "Add member"}
          </button>
          {err && <span className="text-sm font-medium text-[#e2445c]">{err}</span>}
          <span className="text-xs text-[#9699a6]">They can sign in with Google using this email.</span>
        </div>
      </div>

      {/* People list */}
      <div className="m-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-[#e6e9ef] bg-[#f9fafc] text-left text-xs font-semibold uppercase tracking-wider text-[#676879]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f2f5]">
            {people.map((p) => (
              <tr key={p.id} className="hover:bg-[#f9fafc]">
                <td className="px-4 py-3 font-semibold text-[#323338]">{p.name}</td>
                <td className="px-4 py-3 text-[#676879]">{p.email}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ backgroundColor: ROLE_HEX[p.role] }}>
                    {ROLE_LABEL[p.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#676879]">{p.locationName ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={p.status === "ACTIVE" ? "text-[#00c875]" : "text-[#9699a6]"}>
                    {p.status === "ACTIVE" ? "● Active" : "○ Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {p.id !== currentUserId && (
                    <button onClick={() => toggle(p.id, p.status)} className="text-xs font-medium text-[#676879] hover:text-[#0073ea]">
                      {p.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
