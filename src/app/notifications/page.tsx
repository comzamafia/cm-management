import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  NOTIFICATION_TYPE_LABEL,
  NOTIFICATION_TYPE_STYLE,
  formatDateTime,
} from "@/lib/labels";
import { MarkAllReadButton } from "@/components/MarkAllReadButton";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="text-slate-600">Select a user from the top-right switcher.</div>;
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
        {unread > 0 && <MarkAllReadButton count={unread} />}
      </div>

      <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`flex items-start gap-3 px-5 py-4 ${n.read ? "" : "bg-blue-50/50"}`}
          >
            {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
            {n.read && <span className="mt-1.5 h-2 w-2 shrink-0" />}
            <div className="min-w-0 flex-1">
              <div className={`text-xs font-semibold ${NOTIFICATION_TYPE_STYLE[n.type]}`}>
                {NOTIFICATION_TYPE_LABEL[n.type]}
              </div>
              <div className="font-medium text-slate-900">{n.title}</div>
              <div className="text-sm text-slate-600">{n.body}</div>
              <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                <span>{formatDateTime(n.createdAt)}</span>
                {n.entityType === "Task" && n.entityId && (
                  <Link href={`/tasks/${n.entityId}`} className="text-blue-600 hover:underline">
                    View task
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="px-5 py-10 text-center text-slate-400">No notifications yet.</div>
        )}
      </div>
    </div>
  );
}
