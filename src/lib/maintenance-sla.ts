import { Priority } from "@prisma/client";
import { prisma } from "./prisma";
import { logActivity } from "./activity";
import { createNotification } from "./notifications";

// Hours a request may sit unresolved before it breaches SLA, by priority.
const SLA_HOURS: Record<Priority, number> = {
  CRITICAL: 4,
  HIGH: 24,
  MEDIUM: 72,
  LOW: 168,
};

/**
 * Flags maintenance requests that have been unresolved past their priority SLA
 * and escalates to the location's managers. De-duplicated: a request that has
 * already produced a MAINTENANCE_OVERDUE notification is skipped on later runs.
 */
export async function runMaintenanceSla(now: Date = new Date()): Promise<{ escalated: number }> {
  const open = await prisma.maintenanceRequest.findMany({
    where: { status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] } },
    include: { location: { select: { id: true, name: true } } },
  });

  let escalated = 0;

  for (const r of open) {
    const ageHours = (now.getTime() - r.createdAt.getTime()) / 3_600_000;
    if (ageHours < SLA_HOURS[r.priority]) continue;

    const already = await prisma.notification.findFirst({
      where: { type: "MAINTENANCE_OVERDUE", entityId: r.id },
    });
    if (already) continue;

    await prisma.$transaction(async (tx) => {
      await logActivity(tx, {
        userId: r.reportedById,
        action: "maintenance.sla_breached",
        entity: "MaintenanceRequest",
        entityId: r.id,
        locationId: r.locationId,
        meta: { priority: r.priority, ageHours: Math.round(ageHours) },
      });

      const managers = await tx.user.findMany({
        where: {
          locationId: r.locationId,
          status: "ACTIVE",
          role: { in: ["STORE_MANAGER", "AREA_MANAGER", "OWNER"] },
        },
        select: { id: true },
      });
      for (const m of managers) {
        await createNotification(tx, {
          userId: m.id,
          type: "MAINTENANCE_OVERDUE",
          title: `Maintenance overdue: ${r.title}`,
          body: `${r.priority} request at ${r.location.name} unresolved for ${Math.round(ageHours)}h (SLA ${SLA_HOURS[r.priority]}h).`,
          entityId: r.id,
          entityType: "MaintenanceRequest",
        });
      }
    });
    escalated++;
  }

  return { escalated };
}
