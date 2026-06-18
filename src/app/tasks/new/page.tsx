import Link from "next/link";
import { getCurrentUser, isManager, locationScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewTaskForm } from "@/components/NewTaskForm";

export default async function NewTaskPage() {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to create tasks.</div>;

  // Managers/shift leads create for the team; everyone else gets a personal-task form.
  const canManage = isManager(user.role) || user.role === "SHIFT_LEAD";
  if (!canManage && !user.locationId) {
    return <div className="text-[#726973]">You have no branch assigned — ask a manager to add a task for you.</div>;
  }

  const scope = await locationScopeWhere(user);

  const [locations, users, categories] = await Promise.all([
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
    prisma.category.findMany({
      where: scope.locationId
        ? { OR: [{ locationId: scope.locationId }, { locationId: null }] }
        : {},
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, color: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/tasks" className="text-sm text-[#726973] hover:underline">
        ← Back to tasks
      </Link>
      <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">
        {canManage ? "New Task" : "Add a Task"}
      </h1>
      <NewTaskForm locations={locations} users={users} categories={categories} selfOnly={!canManage} />
    </div>
  );
}
