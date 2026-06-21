"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { NotificationType } from "@prisma/client";
import { markAllRead, markRead, deleteNotification } from "@/lib/notifications";
import {
  NOTIFICATION_TYPE_LABEL,
  NOTIFICATION_TYPE_STYLE,
  notificationHref,
  formatDateTime,
} from "@/lib/labels";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  entityId: string | null;
  entityType: string | null;
  read: boolean;
  createdAt: Date;
};

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<unknown>) => startTransition(() => { void fn(); });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-[#726973] hover:bg-[#F0EBF0]"
        aria-label={`${unreadCount} unread notifications`}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e2445c] px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-[#E4DDE4] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#F0EBF0] px-4 py-2.5">
              <span className="text-sm font-bold text-[#140516]">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={() => run(markAllRead)} disabled={pending}
                  className="text-xs font-semibold text-[#440E48] hover:underline">
                  Mark all read
                </button>
              )}
            </div>

            <ul className="max-h-[60vh] divide-y divide-[#F3EEF3] overflow-y-auto">
              {notifications.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-[#A19BA2]">All caught up! 🎉</li>
              )}
              {notifications.map((n) => {
                const href = notificationHref(n.entityType, n.entityId);
                const body = (
                  <div className="min-w-0 flex-1">
                    <div className={`text-[11px] font-bold uppercase tracking-wide ${NOTIFICATION_TYPE_STYLE[n.type]}`}>
                      {NOTIFICATION_TYPE_LABEL[n.type]}
                    </div>
                    <div className="truncate text-sm font-semibold text-[#140516]">{n.title}</div>
                    <div className="mt-0.5 line-clamp-2 text-xs leading-snug text-[#726973]">{n.body}</div>
                    <div className="mt-1 text-xs text-[#A19BA2]">{formatDateTime(n.createdAt)}</div>
                  </div>
                );
                return (
                  <li key={n.id} className={`flex items-start gap-2 px-4 py-3 ${n.read ? "" : "bg-[#FAF6FA]"}`}>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#440E48]" />}
                    {n.read && <span className="mt-1.5 h-2 w-2 shrink-0" />}
                    {href ? (
                      <Link href={href} onClick={() => { setOpen(false); if (!n.read) run(() => markRead(n.id)); }}
                        className="flex min-w-0 flex-1">
                        {body}
                      </Link>
                    ) : (
                      <button onClick={() => { if (!n.read) run(() => markRead(n.id)); }} className="flex min-w-0 flex-1 text-left">
                        {body}
                      </button>
                    )}
                    <button onClick={() => run(() => deleteNotification(n.id))} disabled={pending}
                      aria-label="Delete" className="shrink-0 rounded p-1 text-[#A19BA2] hover:bg-[#fdf2f3] hover:text-[#e2445c]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-[#F0EBF0] px-4 py-2">
              <Link href="/notifications" onClick={() => setOpen(false)}
                className="block text-center text-xs font-semibold text-[#440E48] hover:underline">
                View all notifications →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
