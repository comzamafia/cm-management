"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";
import { NotificationBell, type NotificationItem } from "./NotificationBell";


const I = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  board: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
    </svg>
  ),
  tasks: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  checklists: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6" /><path d="m9 11 3 3L22 4" />
    </svg>
  ),
  people: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  announcements: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
  ),
  training: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  notifications: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
};

type NavItem = { href: string; label: string; icon: React.ReactNode; badge?: number };

const NAV_BASE: Omit<NavItem, "badge">[] = [
  { href: "/dashboard", label: "Dashboard", icon: I.dashboard },
  { href: "/board", label: "Monthly Checklist", icon: I.board },
  { href: "/tasks", label: "Tasks", icon: I.tasks },
  { href: "/checklists", label: "Checklists", icon: I.checklists },
  { href: "/people", label: "People", icon: I.people },
  { href: "/announcements", label: "Announcements", icon: I.announcements },
  { href: "/training", label: "Training Hub", icon: I.training },
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
        <span className="mt-0.5 text-[11px] font-medium text-[#676879]">Operations Management</span>
      </span>
    </Link>
  );
}

type SidebarUser = { name: string; roleLabel: string; locationLabel: string };

function NavList({
  pathname,
  nav,
  onNavigate,
}: {
  pathname: string;
  nav: NavItem[];
  onNavigate?: () => void;
}) {
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  return (
    <nav className="flex flex-col gap-0.5">
      {nav.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-[#e6f1fd] text-[#0073ea]" : "text-[#50515c] hover:bg-[#f5f6f8]"
            }`}
          >
            <span className={active ? "text-[#0073ea]" : "text-[#9699a6]"}>{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span className="ml-auto grid h-4.5 min-w-[18px] place-items-center rounded-full bg-[#e2445c] px-1 text-[10px] font-bold text-white leading-none py-0.5">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function UserCard({ user }: { user: SidebarUser }) {
  return (
    <div className="border-t border-[#e6e9ef] p-3">
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
  );
}

export function Sidebar({
  user,
  notifications,
  unreadCount,
  unreadAnnouncements,
}: {
  user: SidebarUser;
  notifications: NotificationItem[];
  unreadCount: number;
  unreadAnnouncements: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav: NavItem[] = NAV_BASE.map((item) => ({
    ...item,
    badge:
      item.href === "/notifications"
        ? unreadCount || undefined
        : item.href === "/announcements"
          ? unreadAnnouncements || undefined
          : undefined,
  }));

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-[#e6e9ef] bg-white lg:flex print:!hidden">
        <div className="px-5 py-5">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-2 pt-1">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#9699a6]">Main workspace</p>
          <NavList pathname={pathname} nav={nav} />
        </div>
        <div className="mt-auto">
          <UserCard user={user} />
        </div>
      </aside>

      {/* Mobile top bar: hamburger + logo + bell */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-[#e6e9ef] bg-white px-4 py-3 lg:hidden print:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="relative text-[#323338]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          {/* Total badge dot for mobile */}
          {(unreadCount + unreadAnnouncements) > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#e2445c]" />
          )}
        </button>
        <div className="flex-1">
          <Logo />
        </div>
        <NotificationBell notifications={notifications} unreadCount={unreadCount} />
      </div>

      {/* Mobile slide-in drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between px-5 py-5">
              <Logo />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="text-[#676879]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-2 pt-1">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#9699a6]">Main workspace</p>
              <NavList pathname={pathname} nav={nav} onNavigate={() => setOpen(false)} />
            </div>
            <div className="mt-auto">
              <UserCard user={user} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
