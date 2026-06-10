import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isManager, locationScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewTaskForm } from "@/components/NewTaskForm";

export default async function NewTaskPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="text-slate-600">Select a user from the top-right switcher.</div>;
  }
  if (!isManager(user.role) && user.role !== "SHIFT_LEAD") {
    redirect("/tasks");
  }

  const scope = await locationScopeWhere(user);
  const [locations, users] = await Promise.all([
    prisma.location.findMany({
      where: scope.locationId ? { id: scope.locationId } : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { ...scope, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true, locationId: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/tasks" className="text-sm text-slate-500 hover:underline">
        ← Back to tasks
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900">New Task</h1>
      <NewTaskForm locations={locations} users={users} />
    </div>
  );
}
