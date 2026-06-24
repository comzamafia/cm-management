import Link from "next/link";
import { getCurrentUser, canManageCompliance, locationScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ComplianceForm } from "@/components/ComplianceForm";

export default async function NewCompliancePage() {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to add a schedule.</div>;
  if (!canManageCompliance(user.role)) {
    return <div className="text-[#726973]">Only managers can create compliance schedules.</div>;
  }

  const scope = await locationScopeWhere(user);
  const [locations, users] = await Promise.all([
    prisma.location.findMany({
      where: scope.locationId ? { id: { in: scope.locationId.in } } : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { ...scope, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/compliance" className="text-sm text-[#726973] hover:text-[#440E48] hover:underline">
        ← Back to compliance
      </Link>
      <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">New compliance schedule</h1>
      <ComplianceForm locations={locations} users={users} defaultLocationId={user.locationId} />
    </div>
  );
}
