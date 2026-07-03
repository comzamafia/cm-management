"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { getCurrentUser, atLeast, locationScopeWhere } from "./auth";
import { isLocationInScope } from "./rules";
import { logActivity } from "./activity";
import { parseReservationCsv, computeDashboard, type Dashboard } from "./reservation-data";

export type ActionResult = { ok: boolean; error?: string; businessDate?: string; rowCount?: number };

/** Locations the current user may upload a reservation import for / view. */
export async function getReservationLocations() {
  const user = await getCurrentUser();
  if (!user) return [];
  const scope = await locationScopeWhere(user);
  return prisma.location.findMany({
    where: scope.locationId ? { id: { in: scope.locationId.in } } : {},
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function importReservationCsv(
  csvText: string,
  locationId: string,
  fileName?: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!atLeast(user.role, Role.SHIFT_LEAD)) return { ok: false, error: "Not permitted" };
  if (!isLocationInScope(user, locationId)) return { ok: false, error: "Location out of scope" };

  const { rows, businessDate, errors } = parseReservationCsv(csvText);
  if (errors.length > 0 && rows.length === 0) {
    return { ok: false, error: errors[0] };
  }
  if (!businessDate) {
    return { ok: false, error: "Couldn't determine which night this file covers — check the reservedTime column." };
  }

  await prisma.$transaction(async (tx) => {
    // Re-uploading the same night replaces it — cascade removes old records.
    await tx.reservationImport.deleteMany({ where: { locationId, businessDate } });

    const importRow = await tx.reservationImport.create({
      data: {
        locationId,
        businessDate,
        uploadedById: user.id,
        fileName: fileName ?? null,
        rowCount: rows.length,
      },
    });

    if (rows.length > 0) {
      await tx.reservationRecord.createMany({
        data: rows.map((r) => ({
          importId: importRow.id,
          reservedAt: r.reservedAt,
          telephone: r.telephone || null,
          customerName: r.customerName,
          numberOfGuests: r.numberOfGuests,
          assignedTables: r.assignedTables || null,
          status: r.status,
          source: r.source || null,
          hoursCategory: r.hoursCategory || null,
          additionalRequest: r.additionalRequest || null,
        })),
      });
    }

    await logActivity(tx, {
      userId: user.id,
      action: "reservation.imported",
      entity: "ReservationImport",
      entityId: importRow.id,
      locationId,
      meta: { businessDate, rowCount: rows.length, fileName },
    });
  });

  revalidatePath("/reservations");
  return { ok: true, businessDate, rowCount: rows.length };
}

export type ReservationDashboardResult = {
  businessDate: string;
  fileName: string | null;
  uploadedAt: Date;
  uploadedByName: string;
  dashboard: Dashboard;
} | null;

export async function getReservationDashboard(
  locationId: string,
  businessDate?: string,
): Promise<ReservationDashboardResult> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!isLocationInScope(user, locationId)) return null;

  const importRow = businessDate
    ? await prisma.reservationImport.findUnique({
        where: { locationId_businessDate: { locationId, businessDate } },
        include: { records: true, uploadedBy: { select: { name: true } } },
      })
    : await prisma.reservationImport.findFirst({
        where: { locationId },
        orderBy: { businessDate: "desc" },
        include: { records: true, uploadedBy: { select: { name: true } } },
      });

  if (!importRow) return null;

  const rows = importRow.records.map((r) => ({
    reservedAt: r.reservedAt,
    telephone: r.telephone ?? "",
    customerName: r.customerName,
    numberOfGuests: r.numberOfGuests,
    assignedTables: r.assignedTables ?? "",
    status: r.status,
    source: r.source ?? "",
    hoursCategory: r.hoursCategory ?? "",
    additionalRequest: r.additionalRequest ?? "",
  }));

  const zones = await prisma.floorZone.findMany({
    where: { locationId },
    orderBy: { position: "asc" },
    select: { name: true, tableIds: true },
  });

  return {
    businessDate: importRow.businessDate,
    fileName: importRow.fileName,
    uploadedAt: importRow.createdAt,
    uploadedByName: importRow.uploadedBy.name,
    dashboard: computeDashboard(rows, zones),
  };
}

export async function getReservationImportDates(locationId: string): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  if (!isLocationInScope(user, locationId)) return [];

  const imports = await prisma.reservationImport.findMany({
    where: { locationId },
    select: { businessDate: true },
    orderBy: { businessDate: "desc" },
    take: 30,
  });
  return imports.map((i) => i.businessDate);
}
