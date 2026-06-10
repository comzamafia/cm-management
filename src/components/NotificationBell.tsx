"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { NotificationType } from "@prisma/client";
import { markAllRead, markRead } from "@/lib/notifications";
import { NOTIFICATION_TYPE_LABEL, NOTIFICATION_TYPE_STYLE, formatDateTime } from "@/lib/labels";

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

  function handleMarkAll() {
    startTransition(async () => {
      await markAllRead();
      setOpen(false);
    });
  }

  function handleMarkOne(id: string) {
    startTransition(() => {
      void markRead(id);
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-1.5 text-slate-300 hover:bg-slate-700"
        aria-label={`${unreadCount} unread notifications`}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-700 px-4 py-2.5">
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  disabled={pending}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Mark all read
                </button>
              )}
            </div>

            <ul className="max-h-80 overflow-y-auto divide-y divide-slate-800">
              {notifications.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-slate-500">All caught up!</li>
              )}
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`flex gap-2 px-4 py-3 ${n.read ? "opacity-60" : "bg-slate-800/50"}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold ${NOTIFICATION_TYPE_STYLE[n.type]}`}>
                      {NOTIFICATION_TYPE_LABEL[n.type]}
                    </div>
                    <div className="truncate text-sm text-white">{n.title}</div>
                    <div className="mt-0.5 text-xs text-slate-400 leading-snug">{n.body}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatDateTime(n.createdAt)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {n.entityType === "Task" && n.entityId && (
                      <Link
                        href={`/tasks/${n.entityId}`}
                        onClick={() => { setOpen(false); if (!n.read) handleMarkOne(n.id); }}
                        className="text-xs text-blue-400 hover:underline"
                      >
                        View
                      </Link>
                    )}
                    {!n.read && (
                      <button
                        onClick={() => handleMarkOne(n.id)}
                        className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1"
                        title="Mark read"
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-slate-700 px-4 py-2">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="block text-center text-xs text-slate-400 hover:text-white"
              >
                View all notifications →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
