import { getCurrentUser, hasGlobalScope } from "@/lib/auth";
import { getNotificationSettings } from "@/lib/settings";
import { NotificationSettingsForm } from "@/components/NotificationSettingsForm";

export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to manage settings.</div>;
  if (!hasGlobalScope(user.role)) {
    return <div className="text-[#726973]">Owner / Area Manager access required.</div>;
  }

  const settings = await getNotificationSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">Notification Settings</h1>
        <p className="mt-0.5 text-sm text-[#726973]">
          Control the timing of the daily reminders (task due-soon, overdue, and compliance). Applies to everyone.
        </p>
      </div>

      <NotificationSettingsForm initial={settings} />

      <p className="text-xs text-[#A19BA2]">
        Reminders are sent by the daily scheduler. Each user must also enable push on their device
        (Notifications page) to receive these as phone/desktop alerts.
      </p>
    </div>
  );
}
