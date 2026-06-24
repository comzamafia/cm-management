import { getCurrentUser } from "@/lib/auth";
import { canSeeActionPlan, getActionPlan, getActionPlanTasks } from "@/lib/action-plan";
import { isoWeekId, monthId, localDateISO } from "@/lib/time";
import { ActionPlanTracker } from "@/components/ActionPlanTracker";

export const dynamic = "force-dynamic";

export default async function ActionPlanPage() {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to continue.</div>;

  if (!(await canSeeActionPlan(user))) {
    return (
      <div className="rounded-xl border border-[#F4D58A] bg-[#FDF6E7] p-5 text-sm text-[#8A5A00] print:hidden">
        <div className="font-bold">Access restricted</div>
        <div className="mt-1">This page is available to its assigned owners only.</div>
      </div>
    );
  }

  const now = new Date();
  const week = isoWeekId(now);
  const month = monthId(now);
  const todayISO = localDateISO(now);
  const [entries, tasks] = await Promise.all([
    getActionPlan(week, month),
    getActionPlanTasks(),
  ]);

  return (
    <ActionPlanTracker
      week={week}
      month={month}
      todayISO={todayISO}
      entries={entries}
      weeklyTasks={tasks.weekly}
      monthlyTasks={tasks.monthly}
      vendors={tasks.vendors}
    />
  );
}
