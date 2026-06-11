"use server";

import { revalidatePath } from "next/cache";
import { InventoryUnit, Role } from "@prisma/client";
import { prisma } from "./prisma";
import { getCurrentUser, atLeast, locationScopeWhere } from "./auth";

export type ActionResult = { ok: boolean; error?: string };

function isLow(item: { currentQty: number; reorderLevel: number | null }) {
  return item.reorderLevel != null && item.currentQty <= item.reorderLevel;
}

/** Active items in the user's scope, with a derived low-stock flag. */
export async function getInventory() {
  const user = await getCurrentUser();
  if (!user) return [];
  const scope = await locationScopeWhere(user);
  const items = await prisma.inventoryItem.findMany({
    where: { ...scope, active: true },
    include: { location: { select: { name: true } } },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return items.map((i) => ({ ...i, low: isLow(i) }));
}

/** Count of low-stock items in scope (for the dashboard tile). */
export async function getLowStockCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  const scope = await locationScopeWhere(user);
  const items = await prisma.inventoryItem.findMany({
    where: { ...scope, active: true, reorderLevel: { not: null } },
    select: { currentQty: true, reorderLevel: true },
  });
  return items.filter(isLow).length;
}

/** Create an inventory item (managers only). */
export async function createInventoryItem(input: {
  name: string;
  sku?: string;
  unit: InventoryUnit;
  category?: string;
  locationId: string;
  parLevel?: number | null;
  reorderLevel?: number | null;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!atLeast(user.role, Role.STORE_MANAGER)) return { ok: false, error: "Managers only" };
  if (!input.name.trim()) return { ok: false, error: "Name is required" };

  const scope = await locationScopeWhere(user);
  if (scope.locationId && !scope.locationId.in.includes(input.locationId)) {
    return { ok: false, error: "Outside your location scope" };
  }

  await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.create({
      data: {
        name: input.name.trim(),
        sku: input.sku?.trim() || null,
        unit: input.unit,
        category: input.category?.trim() || null,
        locationId: input.locationId,
        parLevel: input.parLevel ?? null,
        reorderLevel: input.reorderLevel ?? null,
        createdById: user.id,
      },
    });
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "inventory.item_created",
        entity: "InventoryItem",
        entityId: item.id,
        locationId: input.locationId,
        meta: { name: item.name },
      },
    });
  });

  revalidatePath("/inventory");
  return { ok: true };
}

/** Archive (soft-delete) an item — managers only. */
export async function archiveInventoryItem(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!atLeast(user.role, Role.STORE_MANAGER)) return { ok: false, error: "Managers only" };
  const scope = await locationScopeWhere(user);
  const item = await prisma.inventoryItem.findFirst({ where: { id, ...scope } });
  if (!item) return { ok: false, error: "Not found or out of scope" };

  await prisma.$transaction(async (tx) => {
    await tx.inventoryItem.update({ where: { id }, data: { active: false } });
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "inventory.item_archived",
        entity: "InventoryItem",
        entityId: id,
        locationId: item.locationId,
        meta: { name: item.name },
      },
    });
  });
  revalidatePath("/inventory");
  return { ok: true };
}

/**
 * Submit a stock count. Any active staff member in the location may count.
 * Updates each item's currentQty snapshot, records the count + lines, and
 * fires low-stock notifications to managers for any item at/below reorder.
 */
export async function submitInventoryCount(input: {
  locationId: string;
  note?: string;
  lines: { itemId: string; countedQty: number }[];
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (input.lines.length === 0) return { ok: false, error: "Nothing counted" };

  const scope = await locationScopeWhere(user);
  if (scope.locationId && !scope.locationId.in.includes(input.locationId)) {
    return { ok: false, error: "Outside your location scope" };
  }

  // Load the items being counted (must belong to the location).
  const items = await prisma.inventoryItem.findMany({
    where: { id: { in: input.lines.map((l) => l.itemId) }, locationId: input.locationId },
  });
  const byId = new Map(items.map((i) => [i.id, i]));

  const lowStock: { id: string; name: string; qty: number; reorder: number }[] = [];

  await prisma.$transaction(async (tx) => {
    const count = await tx.inventoryCount.create({
      data: {
        locationId: input.locationId,
        countedById: user.id,
        note: input.note?.trim() || null,
      },
    });

    for (const line of input.lines) {
      const item = byId.get(line.itemId);
      if (!item) continue;
      await tx.inventoryCountLine.create({
        data: {
          countId: count.id,
          itemId: item.id,
          countedQty: line.countedQty,
          previousQty: item.currentQty,
        },
      });
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { currentQty: line.countedQty },
      });
      if (item.reorderLevel != null && line.countedQty <= item.reorderLevel) {
        lowStock.push({ id: item.id, name: item.name, qty: line.countedQty, reorder: item.reorderLevel });
      }
    }

    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "inventory.count_submitted",
        entity: "InventoryCount",
        entityId: count.id,
        locationId: input.locationId,
        meta: { items: input.lines.length, lowStock: lowStock.length },
      },
    });

    if (lowStock.length > 0) {
      const managers = await tx.user.findMany({
        where: {
          locationId: input.locationId,
          status: "ACTIVE",
          role: { in: [Role.STORE_MANAGER, Role.AREA_MANAGER, Role.OWNER] },
        },
        select: { id: true },
      });
      const names = lowStock.map((l) => l.name).slice(0, 5).join(", ");
      await tx.notification.createMany({
        data: managers.map((m) => ({
          userId: m.id,
          type: "INVENTORY_LOW_STOCK" as const,
          title: `${lowStock.length} item(s) low on stock`,
          body: names + (lowStock.length > 5 ? "…" : ""),
          entityId: input.locationId,
          entityType: "Location",
        })),
      });
    }
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { ok: true };
}
