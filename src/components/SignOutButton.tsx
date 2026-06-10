"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
    >
      Sign out
    </button>
  );
}
