"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";
import { NotificationBell, type NotificationItem } from "./NotificationBell";
import { LOGO_MARK_DATA_URI } from "@/lib/logo";

const I = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  board: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
    </svg>
  ),
  projects: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v3" /><path d="M2 13h20" /><rect x="2" y="7" width="20" height="13" rx="2" />
    </svg>
  ),
  tasks: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  checklists: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6" /><path d="m9 11 3 3L22 4" />
    </svg>
  ),
  people: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  announcements: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
  ),
  training: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  notifications: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  maintenance: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6z" />
    </svg>
  ),
  inventory: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M3.27 6.96 12 12.01l8.73-5.05" /><path d="M12 22.08V12" />
    </svg>
  ),
};

type NavItem = { href: string; label: string; icon: React.ReactNode; badge?: number };

const NAV_BASE: Omit<NavItem, "badge">[] = [
  { href: "/dashboard",     label: "Dashboard",        icon: I.dashboard },
  { href: "/projects",      label: "Projects",          icon: I.projects },
  { href: "/tasks",         label: "Tasks",             icon: I.tasks },
  { href: "/calendar",      label: "Calendar",          icon: I.calendar },
  { href: "/checklists",    label: "Checklists",        icon: I.checklists },
  { href: "/maintenance",   label: "Maintenance",       icon: I.maintenance },
  { href: "/inventory",     label: "Inventory",         icon: I.inventory },
  { href: "/people",        label: "People",            icon: I.people },
  { href: "/announcements", label: "Announcements",     icon: I.announcements },
  { href: "/training",      label: "Training Hub",      icon: I.training },
  { href: "/notifications", label: "Notifications",     icon: I.notifications },
];

function initials(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_MARK_DATA_URI} alt="" className="h-7 w-7 object-contain" />
      </div>
      <span className="flex flex-col leading-none">
        <span
          className="text-[14px] font-light tracking-[0.12em] text-white"
          style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
        >
          CHIANG MAI
        </span>
        <span className="mt-0.5 text-[9px] font-medium tracking-[0.18em] text-[#F4A626]/70 uppercase">
          Operations
        </span>
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
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="flex flex-col gap-0.5">
      {nav.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              active
                ? "bg-[#F4A626]/15 text-[#F4A626]"
                : "text-white/65 hover:bg-white/8 hover:text-white/90"
            }`}
          >
            <span className={active ? "text-[#F4A626]" : "text-white/40"}>
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span className="ml-auto grid h-4.5 min-w-[18px] place-items-center rounded-full bg-[#943B13] px-1 text-[10px] font-bold leading-none text-white">
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
    <div className="border-t border-white/10 p-3">
      <Link
        href="/profile"
        className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-white/8"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F4A626] text-xs font-bold text-[#440E48]">
          {initials(user.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">{user.name}</div>
          <div className="truncate text-[11px] text-white/50">{user.roleLabel}</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-white/30">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </Link>
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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-[#440E48] lg:flex print:!hidden">
        {/* Top gold accent line */}
        <div
          className="h-[2px] w-full shrink-0"
          style={{ background: "linear-gradient(90deg, transparent, #F4A626 40%, #F4A626 60%, transparent)" }}
        />
        <div className="px-5 py-5">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-2 pt-1">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
            Workspace
          </p>
          <NavList pathname={pathname} nav={nav} />
        </div>
        <div className="mt-auto">
          <UserCard user={user} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center gap-3 bg-[#440E48] px-4 py-3 lg:hidden print:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="relative text-white/80"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          {(unreadCount + unreadAnnouncements) > 0 && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#943B13]" />
          )}
        </button>
        <div className="flex-1">
          <Logo />
        </div>
        <NotificationBell notifications={notifications} unreadCount={unreadCount} />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col bg-[#440E48] shadow-2xl">
            <div
              className="h-[2px] w-full shrink-0"
              style={{ background: "linear-gradient(90deg, transparent, #F4A626 40%, #F4A626 60%, transparent)" }}
            />
            <div className="flex items-center justify-between px-5 py-5">
              <Logo />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="text-white/60 hover:text-white"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-2 pt-1">
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Workspace
              </p>
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
