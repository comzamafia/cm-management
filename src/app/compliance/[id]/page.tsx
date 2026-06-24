import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, canManageCompliance } from "@/lib/auth";
import { getComplianceScheduleDetail } from "@/lib/compliance";
import { ComplianceDetail } from "@/components/ComplianceDetail";
import { prisma } from "@/lib/prisma";
import { locationScopeWhere } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ComplianceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to continue.</div>;

  const result = await getComplianceScheduleDetail(id, user);
  if (!result) notFound();

  const canEdit = canManageCompliance(user.role);
  const scope = await locationScopeWhere(user);
  const users = canEdit
    ? await prisma.user.findMany({
        where: { ...scope, status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/compliance"
          className="flex items-center gap-1.5 text-sm font-medium text-[#726973] hover:text-[#440E48]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Compliance
        </Link>
        <span className="text-[#A19BA2]">/</span>
        <span className="text-sm text-[#140516] font-medium truncate max-w-[300px]">
          {result.schedule.name}
        </span>
      </div>

      <ComplianceDetail
        schedule={result.schedule}
        activity={result.activity}
        users={users}
        canEdit={canEdit}
        currentUserId={user.id}
      />
    </div>
  );
}
