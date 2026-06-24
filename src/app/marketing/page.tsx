import { getCurrentUser } from "@/lib/auth";
import { canSeePlan, getActionPlan, getActionPlanTasks } from "@/lib/action-plan";
import { isoWeekId, monthId, localDateISO } from "@/lib/time";
import { ActionPlanTracker } from "@/components/ActionPlanTracker";

export const dynamic = "force-dynamic";

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; month?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to continue.</div>;

  if (!(await canSeePlan("marketing", user))) {
    return (
      <div className="rounded-xl border border-[#F4D58A] bg-[#FDF6E7] p-5 text-sm text-[#8A5A00] print:hidden">
        <div className="font-bold">Access restricted</div>
        <div className="mt-1">This page is available to its assigned owners only.</div>
      </div>
    );
  }

  const now = new Date();
  const sp = await searchParams;
  const currentWeek = isoWeekId(now);
  const currentMonth = monthId(now);
  const week = sp.week && /^\d{4}-W\d{2}$/.test(sp.week) ? sp.week : currentWeek;
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : currentMonth;
  const todayISO = localDateISO(now);
  const isCurrentPeriod = week === currentWeek && month === currentMonth;

  const [entries, tasks] = await Promise.all([
    getActionPlan("marketing", week, month),
    getActionPlanTasks("marketing"),
  ]);

  return (
    <ActionPlanTracker
      page="marketing"
      title="Marketing & Operations Tracker"
      basePath="/marketing"
      week={week}
      month={month}
      currentWeek={currentWeek}
      currentMonth={currentMonth}
      todayISO={todayISO}
      entries={entries}
      weeklyTasks={tasks.weekly}
      monthlyTasks={tasks.monthly}
      vendors={tasks.vendors}
      isCurrentPeriod={isCurrentPeriod}
    />
  );
}
