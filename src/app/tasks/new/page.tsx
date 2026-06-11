import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isManager, locationScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewTaskForm } from "@/components/NewTaskForm";

export default async function NewTaskPage() {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to create tasks.</div>;
  if (!isManager(user.role) && user.role !== "SHIFT_LEAD") redirect("/tasks");

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
      <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">New Task</h1>
      <NewTaskForm locations={locations} users={users} categories={categories} />
    </div>
  );
}
