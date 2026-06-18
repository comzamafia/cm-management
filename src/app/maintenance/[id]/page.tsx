import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentUser, atLeast } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMaintenanceDetail } from "@/lib/maintenance";
import { MaintenanceDetailClient } from "@/components/MaintenanceDetailClient";

export const dynamic = "force-dynamic";

export default async function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to view this request.</div>;

  const req = await getMaintenanceDetail(id);
  if (!req) notFound();

  const canManage = atLeast(user.role, Role.STORE_MANAGER);
  const canAct = atLeast(user.role, Role.SHIFT_LEAD);
  const canComment = true; // anyone who can see the request can comment

  const assignables = canManage
    ? await prisma.user.findMany({
        where: { locationId: req.locationId, status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/maintenance" className="flex items-center gap-1.5 font-medium text-[#726973] hover:text-[#440E48]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Maintenance
        </Link>
        <span className="text-[#A19BA2]">/</span>
        <span className="truncate font-medium text-[#140516] max-w-[280px] sm:max-w-none">{req.title}</span>
      </div>

      <MaintenanceDetailClient
        req={req}
        activity={req.activity}
        assignables={assignables}
        canManage={canManage}
        canAct={canAct}
        canComment={canComment}
        currentUserId={user.id}
      />
    </div>
  );
}
