import { getCurrentUser } from "@/lib/auth";
import { getUserTaskTracker } from "@/lib/queries";
import { ROLE_LABEL } from "@/lib/labels";
import { APP_TZ } from "@/lib/time";
import { TaskTracker } from "@/components/TaskTracker";

export const dynamic = "force-dynamic";

// Per-person task tracker. Every user gets a menu item labelled with their own
// name (see Sidebar) that lands here. Rolls the user's own tasks into the
// Marketing/Operations tracker layout with Dashboard / Weekly / Monthly /
// All Tasks / Summary tabs; the owner can mark their tasks done / change status.
export default async function TrackerPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="m-card p-8 text-center text-[#726973]">Sign in to view your tracker.</div>;
  }

  const data = await getUserTaskTracker(user.id);
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: APP_TZ });

  return (
    <TaskTracker
      name={user.name}
      roleLabel={ROLE_LABEL[user.role]}
      locationName={user.location?.name ?? null}
      todayLabel={today}
      data={data}
    />
  );
}
