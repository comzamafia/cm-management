import Link from "next/link";
import { getCurrentUser, atLeast, locationScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { MaintenanceForm } from "@/components/MaintenanceForm";

export default async function NewMaintenancePage() {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to report an issue.</div>;

  const canChooseLocation = atLeast(user.role, Role.AREA_MANAGER);
  const scope = await locationScopeWhere(user);

  const locations = canChooseLocation
    ? await prisma.location.findMany({
        where: scope.locationId ? { id: { in: scope.locationId.in } } : {},
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : user.location
      ? [{ id: user.location.id, name: user.location.name }]
      : [];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/maintenance" className="text-sm text-[#726973] hover:text-[#440E48] hover:underline">
        ← Back to maintenance
      </Link>
      <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">Report an issue</h1>
      <MaintenanceForm locations={locations} canChooseLocation={canChooseLocation} />
    </div>
  );
}
