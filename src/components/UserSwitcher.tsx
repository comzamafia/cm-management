"use client";

import { useTransition } from "react";
import { Role } from "@prisma/client";
import { setCurrentUser } from "@/lib/session";
import { ROLE_LABEL } from "@/lib/labels";

type Option = { id: string; name: string; role: Role };

export function UserSwitcher({
  users,
  currentId,
}: {
  users: Option[];
  currentId: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-slate-300 sm:inline">Acting as</span>
      <select
        value={currentId ?? ""}
        disabled={pending}
        onChange={(e) =>
          startTransition(() => {
            void setCurrentUser(e.target.value);
          })
        }
        className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-white"
      >
        {!currentId && <option value="">Select user…</option>}
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} — {ROLE_LABEL[u.role]}
          </option>
        ))}
      </select>
    </label>
  );
}
