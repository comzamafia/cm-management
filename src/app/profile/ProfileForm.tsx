"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMyProfile, changePassword } from "@/lib/profile";
import { ROLE_LABEL } from "@/lib/labels";
import type { Role } from "@prisma/client";

type Props = {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    phone: string | null;
    locationName: string | null;
  };
};

const field =
  "w-full rounded-xl border border-[#E4DDE4] bg-white px-4 py-2.5 text-sm text-[#140516] placeholder-[#A19BA2] outline-none transition focus:border-[#440E48] focus:ring-2 focus:ring-[#440E48]/10 disabled:bg-[#F9F6F9] disabled:text-[#A19BA2]";
const label = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#726973]";

export function ProfileForm({ user }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const saveProfile = () =>
    startTransition(async () => {
      setProfileMsg(null);
      const res = await updateMyProfile({ name, phone: phone || undefined });
      setProfileMsg(res.ok ? { ok: true, text: "Profile updated." } : { ok: false, text: res.error });
      if (res.ok) router.refresh();
    });

  const savePassword = () =>
    startTransition(async () => {
      setPwMsg(null);
      if (newPw !== confirmPw) { setPwMsg({ ok: false, text: "Passwords don't match." }); return; }
      if (newPw.length < 8) { setPwMsg({ ok: false, text: "At least 8 characters required." }); return; }
      const res = await changePassword({ currentPassword: currentPw, newPassword: newPw });
      if (res.ok) {
        setPwMsg({ ok: true, text: "Password changed successfully." });
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
      } else {
        setPwMsg({ ok: false, text: res.error });
      }
    });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Profile info */}
      <div className="m-card p-6">
        <div className="mb-5 flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#F4A626] text-xl font-bold text-[#440E48]">
            {user.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
          </span>
          <div>
            <div className="text-lg font-semibold text-[#140516]">{user.name}</div>
            <div className="text-sm text-[#726973]">{ROLE_LABEL[user.role]}</div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Full name</label>
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input className={field} placeholder="e.g. 416-555-0100" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className={label}>Email</label>
            <input className={field} value={user.email} disabled />
          </div>
          <div>
            <label className={label}>Location</label>
            <input className={field} value={user.locationName ?? "All locations"} disabled />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={saveProfile}
            disabled={pending || !name.trim()}
            className="m-btn disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save Profile"}
          </button>
          {profileMsg && (
            <span className={`text-sm font-medium ${profileMsg.ok ? "text-[#1DBA87]" : "text-[#943B13]"}`}>
              {profileMsg.text}
            </span>
          )}
        </div>
      </div>

      {/* Change password */}
      <div className="m-card p-6">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#726973]">Change Password</h2>
        <div className="space-y-3">
          <div className="relative">
            <label className={label}>Current password</label>
            <input
              type={showPw ? "text" : "password"}
              className={field}
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>New password</label>
              <input
                type={showPw ? "text" : "password"}
                className={field}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
              />
            </div>
            <div>
              <label className={label}>Confirm new password</label>
              <input
                type={showPw ? "text" : "password"}
                className={field}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-[#726973] select-none">
            <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />
            Show passwords
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={savePassword}
            disabled={pending || !currentPw || !newPw || !confirmPw}
            className="m-btn disabled:opacity-60"
          >
            {pending ? "Updating…" : "Change Password"}
          </button>
          {pwMsg && (
            <span className={`text-sm font-medium ${pwMsg.ok ? "text-[#1DBA87]" : "text-[#943B13]"}`}>
              {pwMsg.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
