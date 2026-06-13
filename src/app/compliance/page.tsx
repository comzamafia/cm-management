import Link from "next/link";
import { getCurrentUser, isManager } from "@/lib/auth";
import { getComplianceSchedules } from "@/lib/compliance";
import { ComplianceView } from "@/components/ComplianceView";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to view compliance schedules.</div>;

  const canEdit = isManager(user.role) || user.role === "SHIFT_LEAD";
  const { rows, users, locations, totals } = await getComplianceSchedules(user);
  const multiLoc = locations.length > 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">Compliance Schedule</h1>
          <p className="mt-0.5 text-sm text-[#726973]">
            Recurring preventive-maintenance services — vendor, next due date, and reminders.
          </p>
        </div>
        {canEdit && (
          <Link href="/compliance/new" className="m-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New schedule
          </Link>
        )}
      </div>

      <ComplianceView rows={rows} users={users} totals={totals} canEdit={canEdit} showLocation={multiLoc} />
    </div>
  );
}
