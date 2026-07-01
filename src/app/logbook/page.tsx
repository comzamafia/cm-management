import { redirect } from "next/navigation";
import { getCurrentUser, atLeast } from "@/lib/auth";
import { Role } from "@prisma/client";
import {
  getTodayRollup,
  getAttentionQueueCount,
  getLogbookLocations,
  getKpiData,
} from "@/lib/logbook";
import { LogbookThemeToggle } from "@/components/logbook/LogbookThemeToggle";
import { LogbookApp } from "@/components/logbook/LogbookApp";

export const dynamic = "force-dynamic";

export default async function LogbookPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!atLeast(user.role, Role.EMPLOYEE)) redirect("/dashboard");

  const canManage = atLeast(user.role, Role.STORE_MANAGER);
  const locations = await getLogbookLocations();

  const [rollup, attentionCount, kpi] = canManage
    ? await Promise.all([getTodayRollup(), getAttentionQueueCount(), getKpiData()])
    : [null, 0, null];

  return (
    <LogbookThemeToggle>
      <LogbookApp
        canManage={canManage}
        locations={locations}
        defaultLocationId={user.locationId}
        initialRollup={rollup}
        initialAttentionCount={attentionCount}
        initialKpi={kpi}
      />
    </LogbookThemeToggle>
  );
}
