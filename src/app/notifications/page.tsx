import { getCurrentUser } from "@/lib/auth";
import { isManager } from "@/lib/rules";
import { prisma } from "@/lib/prisma";
import { getLoginHistory } from "@/lib/login-history";
import { PushToggle } from "@/components/PushToggle";
import { NotificationPrefs } from "@/components/NotificationPrefs";
import { NotificationList } from "@/components/NotificationList";
import { LoginHistoryReport } from "@/components/LoginHistoryReport";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="text-[#726973]">Sign in to view notifications.</div>;
  }

  const [notifications, loginHistory] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getLoginHistory(user, 30),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">Notifications</h1>
        <p className="mt-0.5 text-sm text-[#726973]">Your alerts, reminders and mentions.</p>
      </div>

      <PushToggle />
      <NotificationPrefs muted={user.mutedPush ?? []} />
      <LoginHistoryReport days={loginHistory} showUser={isManager(user.role)} />
      <NotificationList items={notifications} />
    </div>
  );
}
