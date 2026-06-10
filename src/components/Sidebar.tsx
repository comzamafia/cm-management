"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";

type NavItem = { href: string; label: string; icon: React.ReactNode };

const I = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  tasks: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  checklists: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  ),
  notifications: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: I.dashboard },
  { href: "/tasks", label: "Tasks", icon: I.tasks },
  { href: "/checklists", label: "Checklists", icon: I.checklists },
  { href: "/notifications", label: "Notifications", icon: I.notifications },
];

function initials(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[#0073ea] to-[#00c875] text-sm font-bold text-white shadow-sm">
        CM
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-bold text-[#323338]">Operations</span>
        <span className="mt-0.5 text-[11px] font-medium text-[#676879]">Who · What · Where · When</span>
      </span>
    </Link>
  );
}

export function Sidebar({
  user,
}: {
  user: { name: string; roleLabel: string; locationLabel: string };
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-[#e6e9ef] bg-white lg:flex">
        <div className="px-5 py-5">
          <Logo />
        </div>

        <div className="px-3 pb-2 pt-1">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#9699a6]">
            Main workspace
          </p>
          <nav className="flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#e6f1fd] text-[#0073ea]"
                      : "text-[#50515c] hover:bg-[#f5f6f8]"
                  }`}
                >
                  <span className={active ? "text-[#0073ea]" : "text-[#9699a6]"}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User card pinned to bottom */}
        <div className="mt-auto border-t border-[#e6e9ef] p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#0073ea] text-xs font-bold text-white">
              {initials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[#323338]">{user.name}</div>
              <div className="truncate text-[11px] text-[#676879]">{user.roleLabel}</div>
            </div>
          </div>
          <div className="mt-1 px-1">
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Mobile top strip */}
      <div className="sticky top-0 z-40 border-b border-[#e6e9ef] bg-white lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
                  active ? "bg-[#e6f1fd] text-[#0073ea]" : "text-[#50515c]"
                }`}
              >
                <span className={active ? "text-[#0073ea]" : "text-[#9699a6]"}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
