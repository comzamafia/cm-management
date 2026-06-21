"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { NotificationType } from "@prisma/client";
import {
  markRead,
  markAllRead,
  deleteNotification,
  clearReadNotifications,
  clearAllNotifications,
} from "@/lib/notifications";
import {
  NOTIFICATION_TYPE_LABEL,
  NOTIFICATION_TYPE_STYLE,
  notificationHref,
  formatDateTime,
} from "@/lib/labels";

export type NotifItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  entityId: string | null;
  entityType: string | null;
  read: boolean;
  createdAt: Date;
};

export function NotificationList({ items }: { items: NotifItem[] }) {
  const [pending, startTransition] = useTransition();
  const [confirmClear, setConfirmClear] = useState(false);

  const unread = items.filter((n) => !n.read).length;
  const hasRead = items.some((n) => n.read);

  const run = (fn: () => Promise<unknown>) => startTransition(() => { void fn(); });

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        {unread > 0 && (
          <button onClick={() => run(markAllRead)} disabled={pending}
            className="rounded-lg border border-[#E4DDE4] bg-white px-3 py-1.5 text-xs font-semibold text-[#440E48] hover:bg-[#FAF6FA]">
            Mark all read
          </button>
        )}
        {hasRead && (
          <button onClick={() => run(clearReadNotifications)} disabled={pending}
            className="rounded-lg border border-[#E4DDE4] bg-white px-3 py-1.5 text-xs font-semibold text-[#726973] hover:bg-[#FAF6FA]">
            Clear read
          </button>
        )}
        {items.length > 0 && (
          confirmClear ? (
            <span className="flex items-center gap-1.5">
              <button onClick={() => run(async () => { await clearAllNotifications(); setConfirmClear(false); })} disabled={pending}
                className="rounded-lg bg-[#e2445c] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110">
                Confirm clear all
              </button>
              <button onClick={() => setConfirmClear(false)} className="px-2 py-1.5 text-xs font-medium text-[#726973]">Cancel</button>
            </span>
          ) : (
            <button onClick={() => setConfirmClear(true)}
              className="rounded-lg border border-[#f3d3d8] bg-white px-3 py-1.5 text-xs font-semibold text-[#e2445c] hover:bg-[#fdf2f3]">
              Clear all
            </button>
          )
        )}
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="m-card p-12 text-center text-[#A19BA2]">
          <p className="text-3xl mb-2">🔔</p>
          <p className="font-medium">You&apos;re all caught up.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E4DDE4] bg-white">
          {items.map((n) => {
            const href = notificationHref(n.entityType, n.entityId);
            const inner = (
              <>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-[#440E48]"}`} />
                <div className="min-w-0 flex-1">
                  <div className={`text-[11px] font-bold uppercase tracking-wide ${NOTIFICATION_TYPE_STYLE[n.type]}`}>
                    {NOTIFICATION_TYPE_LABEL[n.type]}
                  </div>
                  <div className="text-sm font-semibold text-[#140516]">{n.title}</div>
                  <div className="text-sm text-[#726973] break-words">{n.body}</div>
                  <div className="mt-1 text-xs text-[#A19BA2]">{formatDateTime(n.createdAt)}</div>
                </div>
              </>
            );
            return (
              <div key={n.id} className={`flex items-start gap-3 border-b border-[#F3EEF3] px-4 py-3.5 last:border-0 ${n.read ? "" : "bg-[#FAF6FA]"}`}>
                {href ? (
                  <Link href={href} onClick={() => { if (!n.read) run(() => markRead(n.id)); }}
                    className="flex min-w-0 flex-1 items-start gap-3">
                    {inner}
                  </Link>
                ) : (
                  <button onClick={() => { if (!n.read) run(() => markRead(n.id)); }}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left">
                    {inner}
                  </button>
                )}
                <button
                  onClick={() => run(() => deleteNotification(n.id))}
                  disabled={pending}
                  aria-label="Delete notification"
                  className="shrink-0 rounded-md p-2 text-[#A19BA2] hover:bg-[#fdf2f3] hover:text-[#e2445c]"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
