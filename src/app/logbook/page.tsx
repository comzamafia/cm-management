import { redirect } from "next/navigation";
import { getCurrentUser, atLeast } from "@/lib/auth";
import { Role } from "@prisma/client";
import {
  getAttentionQueueCount,
  getLogbookLocations,
  getKpiData,
} from "@/lib/logbook";
import { getSyncedRollup } from "@/lib/ops-sync";
import { LogbookApp } from "@/components/logbook/LogbookApp";

export const dynamic = "force-dynamic";

export default async function LogbookPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!atLeast(user.role, Role.EMPLOYEE)) redirect("/dashboard");

  const canManage = atLeast(user.role, Role.STORE_MANAGER);
  const locations = await getLogbookLocations();

  const [rollup, attentionCount, kpi] = canManage
    ? await Promise.all([getSyncedRollup(), getAttentionQueueCount(), getKpiData()])
    : [null, 0, null];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#140516]">Logbook</h1>
        <p className="mt-0.5 text-sm text-[#726973]">Daily operational log across your locations</p>
      </div>
      <LogbookApp
        canManage={canManage}
        locations={locations}
        defaultLocationId={user.locationId}
        initialRollup={rollup}
        initialAttentionCount={attentionCount}
        initialKpi={kpi}
      />
    </div>
  );
}
