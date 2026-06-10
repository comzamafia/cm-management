import { redirect } from "next/navigation";
import { getCurrentUser, isManager, locationScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PeopleManager } from "@/components/PeopleManager";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#676879]">Sign in to manage people.</div>;
  if (!isManager(user.role)) redirect("/board");

  const scope = await locationScopeWhere(user);
  const [people, locations] = await Promise.all([
    prisma.user.findMany({
      where: scope,
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: { location: { select: { name: true } } },
    }),
    prisma.location.findMany({
      where: scope.locationId ? { id: scope.locationId } : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#323338]">People</h1>
        <p className="mt-0.5 text-sm text-[#676879]">Add team members so you can assign tasks to them.</p>
      </div>
      <PeopleManager
        people={people.map((p) => ({
          id: p.id,
          name: p.name,
          email: p.email,
          role: p.role,
          status: p.status,
          locationName: p.location?.name ?? null,
        }))}
        locations={locations}
        currentUserId={user.id}
      />
    </div>
  );
}
