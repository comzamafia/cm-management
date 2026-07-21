import { getCurrentUser } from "@/lib/auth";
import { ManagerDashboard } from "@/components/ManagerDashboard";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; noteDate?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="m-card p-8 text-center text-[#726973]">
        Sign in to view your workspace.
      </div>
    );
  }

  const { view, noteDate } = await searchParams;

  // Every signed-in user now lands on the operational board (previously only
  // STORE_MANAGER and above got it; front-line staff had a simpler personal
  // view). Data stays scoped per role — getManagerDashboard() shows each user
  // only their own tasks/activity — and manager-only write affordances
  // (View-as, inline owner reassignment, category editing) are gated inside the
  // board by role, so a front-line user gets the layout without the privileges.
  return <ManagerDashboard user={user} viewAs={view} noteDate={noteDate} />;
}
