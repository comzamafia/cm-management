import { redirect } from "next/navigation";
import { getCurrentUser, isManager, locationScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PeopleManager } from "@/components/PeopleManager";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to manage people.</div>;
  if (!isManager(user.role)) redirect("/board");

  const scope = await locationScopeWhere(user);
  const locFilter = scope.locationId ? { id: scope.locationId } : {};

  const [people, locations, locationsWithCounts] = await Promise.all([
    prisma.user.findMany({
      where: scope,
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: { location: { select: { name: true } } },
    }),
    prisma.location.findMany({
      where: locFilter,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.location.findMany({
      where: locFilter,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { users: true, tasks: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">People & Branches</h1>
        <p className="mt-0.5 text-sm text-[#726973]">
          Manage team members and branch locations.
        </p>
      </div>
      <PeopleManager
        people={people.map((p) => ({
          id: p.id,
          name: p.name,
          email: p.email,
          role: p.role,
          locationId: p.locationId,
          phone: p.phone ?? null,
          status: p.status,
          locationName: p.location?.name ?? null,
        }))}
        locations={locations}
        locationRows={locationsWithCounts.map((l) => ({
          id: l.id,
          name: l.name,
          address: l.address,
          region: l.region,
          userCount: l._count.users,
          taskCount: l._count.tasks,
        }))}
        currentUserId={user.id}
      />
    </div>
  );
}
