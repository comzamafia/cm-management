"use server";

import { revalidatePath } from "next/cache";
import { MaintenanceArea, MaintenanceStatus, Priority, Role } from "@prisma/client";
import { prisma } from "./prisma";
import { getCurrentUser, atLeast, locationScopeWhere } from "./auth";
import { sendPushToUser, sendPushToUsers } from "./push";
import { MAINTENANCE_NEXT } from "./labels";

export type ActionResult = { ok: boolean; error?: string };

/** Requests within the current user's location scope. */
export async function getMaintenanceRequests(filters: { status?: MaintenanceStatus } = {}) {
  const user = await getCurrentUser();
  if (!user) return [];
  const scope = await locationScopeWhere(user);
  return prisma.maintenanceRequest.findMany({
    where: {
      ...scope,
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: {
      location: { select: { name: true } },
      reportedBy: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
  });
}

/** Count of non-closed requests in scope (for the dashboard tile). */
export async function getOpenMaintenanceCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  const scope = await locationScopeWhere(user);
  return prisma.maintenanceRequest.count({
    where: { ...scope, status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] } },
  });
}

export async function getMaintenanceDetail(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const scope = await locationScopeWhere(user);
  const req = await prisma.maintenanceRequest.findFirst({
    where: { id, ...scope },
    include: {
      location: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      resolvedBy: { select: { id: true, name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!req) return null;

  const activity = await prisma.activityLog.findMany({
    where: { entity: "MaintenanceRequest", entityId: id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { timestamp: "desc" },
    take: 40,
  });
  return { ...req, activity };
}

export async function addMaintenanceComment(requestId: string, body: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Comment cannot be empty" };
  if (trimmed.length > 2000) return { ok: false, error: "Comment too long (max 2000 chars)" };

  const scope = await locationScopeWhere(user);
  const req = await prisma.maintenanceRequest.findFirst({ where: { id: requestId, ...scope } });
  if (!req) return { ok: false, error: "Request not found or out of scope" };

  await prisma.$transaction(async (tx) => {
    await tx.maintenanceComment.create({ data: { requestId, userId: user.id, body: trimmed } });
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "maintenance.commented",
        entity: "MaintenanceRequest",
        entityId: requestId,
        locationId: req.locationId,
        meta: { excerpt: trimmed.slice(0, 80) },
      },
    });
  });

  revalidatePath(`/maintenance/${requestId}`);
  return { ok: true };
}

export async function deleteMaintenanceComment(commentId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const comment = await prisma.maintenanceComment.findUnique({ where: { id: commentId } });
  if (!comment) return { ok: false, error: "Comment not found" };
  if (comment.userId !== user.id && !atLeast(user.role, Role.STORE_MANAGER)) {
    return { ok: false, error: "Not authorized" };
  }
  await prisma.maintenanceComment.delete({ where: { id: commentId } });
  revalidatePath(`/maintenance/${comment.requestId}`);
  return { ok: true };
}

/** Any active staff member may report a maintenance issue for their location. */
export async function createMaintenanceRequest(input: {
  title: string;
  description?: string;
  area: MaintenanceArea;
  priority: Priority;
  locationId?: string;
  photoUrls?: string[];
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!input.title.trim()) return { ok: false, error: "Title is required" };

  // Employees report for their own location; managers may target a scoped location.
  let locationId = user.locationId;
  if (atLeast(user.role, Role.AREA_MANAGER) && input.locationId) {
    locationId = input.locationId;
  }
  if (!locationId) return { ok: false, error: "No location assigned" };

  // Scope guard: non-area managers limited to their own location.
  const scope = await locationScopeWhere(user);
  if (scope.locationId && !scope.locationId.in.includes(locationId)) {
    return { ok: false, error: "Outside your location scope" };
  }

  let newReqId = "";
  let managerIds: string[] = [];
  await prisma.$transaction(async (tx) => {
    const req = await tx.maintenanceRequest.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        area: input.area,
        priority: input.priority,
        status: "OPEN",
        locationId,
        reportedById: user.id,
        photoUrls: input.photoUrls ?? [],
      },
    });
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "maintenance.reported",
        entity: "MaintenanceRequest",
        entityId: req.id,
        locationId,
        meta: { title: req.title, area: req.area, priority: req.priority },
      },
    });
    // Notify managers of this location.
    const managers = await tx.user.findMany({
      where: {
        locationId,
        status: "ACTIVE",
        role: { in: [Role.STORE_MANAGER, Role.AREA_MANAGER, Role.OWNER] },
      },
      select: { id: true },
    });
    managerIds = managers.filter((m) => m.id !== user.id).map((m) => m.id);
    await tx.notification.createMany({
      data: managerIds.map((id) => ({
        userId: id,
        type: "MAINTENANCE_REPORTED" as const,
        title: `Maintenance: ${req.title}`,
        body: `${req.priority} priority reported by ${user.name}`,
        entityId: req.id,
        entityType: "MaintenanceRequest",
      })),
    });
    newReqId = req.id;
  });

  if (managerIds.length) {
    void sendPushToUsers(managerIds, {
      title: `Maintenance: ${input.title.trim()}`,
      body: `${input.priority} priority reported by ${user.name}`,
      url: `/maintenance/${newReqId}`,
      tag: `maint-${newReqId}`,
      category: "maintenance",
    });
  }

  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Assign a request to an internal user and/or external vendor (managers only). */
export async function assignMaintenance(input: {
  id: string;
  assignedToId?: string | null;
  vendor?: string | null;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!atLeast(user.role, Role.STORE_MANAGER)) return { ok: false, error: "Managers only" };

  const scope = await locationScopeWhere(user);
  const req = await prisma.maintenanceRequest.findFirst({ where: { id: input.id, ...scope } });
  if (!req) return { ok: false, error: "Not found or out of scope" };

  await prisma.$transaction(async (tx) => {
    await tx.maintenanceRequest.update({
      where: { id: req.id },
      data: {
        assignedToId: input.assignedToId ?? null,
        vendor: input.vendor?.trim() || null,
        // Acknowledge on first assignment if still open.
        status: req.status === "OPEN" ? "ACKNOWLEDGED" : req.status,
      },
    });
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "maintenance.assigned",
        entity: "MaintenanceRequest",
        entityId: req.id,
        locationId: req.locationId,
        meta: { assignedToId: input.assignedToId ?? null, vendor: input.vendor ?? null },
      },
    });
    if (input.assignedToId && input.assignedToId !== user.id) {
      await tx.notification.create({
        data: {
          userId: input.assignedToId,
          type: "MAINTENANCE_ASSIGNED",
          title: `Assigned: ${req.title}`,
          body: `${req.priority} priority maintenance task`,
          entityId: req.id,
          entityType: "MaintenanceRequest",
        },
      });
    }
  });

  if (input.assignedToId && input.assignedToId !== user.id) {
    void sendPushToUser(input.assignedToId, {
      title: `Assigned: ${req.title}`,
      body: `${req.priority} priority maintenance task`,
      url: `/maintenance/${input.id}`,
      tag: `maint-${input.id}`,
      category: "maintenance",
    });
  }

  revalidatePath("/maintenance");
  revalidatePath(`/maintenance/${input.id}`);
  return { ok: true };
}

/** Move a request along its status flow. RESOLVED/CLOSED carry extra data. */
export async function transitionMaintenanceStatus(input: {
  id: string;
  to: MaintenanceStatus;
  resolutionNote?: string;
  cost?: number | null;
  photoUrls?: string[];
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!atLeast(user.role, Role.SHIFT_LEAD)) return { ok: false, error: "Shift leads and managers only" };

  const scope = await locationScopeWhere(user);
  const req = await prisma.maintenanceRequest.findFirst({ where: { id: input.id, ...scope } });
  if (!req) return { ok: false, error: "Not found or out of scope" };

  // Validate the transition.
  if (!MAINTENANCE_NEXT[req.status].includes(input.to)) {
    return { ok: false, error: `Cannot move from ${req.status} to ${input.to}` };
  }
  // Only managers may CLOSE (verification step).
  if (input.to === "CLOSED" && !atLeast(user.role, Role.STORE_MANAGER)) {
    return { ok: false, error: "Only managers can close requests" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.maintenanceRequest.update({
      where: { id: req.id },
      data: {
        status: input.to,
        ...(input.to === "RESOLVED"
          ? {
              resolutionNote: input.resolutionNote?.trim() || null,
              cost: input.cost ?? null,
              resolvedById: user.id,
              resolvedAt: new Date(),
              ...(input.photoUrls && input.photoUrls.length
                ? { photoUrls: [...(req.photoUrls as string[]), ...input.photoUrls] }
                : {}),
            }
          : {}),
      },
    });
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "maintenance.status_changed",
        entity: "MaintenanceRequest",
        entityId: req.id,
        locationId: req.locationId,
        meta: { from: req.status, to: input.to },
      },
    });
    if (input.to === "RESOLVED" && req.reportedById !== user.id) {
      await tx.notification.create({
        data: {
          userId: req.reportedById,
          type: "MAINTENANCE_RESOLVED",
          title: `Resolved: ${req.title}`,
          body: input.resolutionNote?.slice(0, 120) || "Marked resolved",
          entityId: req.id,
          entityType: "MaintenanceRequest",
        },
      });
    }
  });

  if (input.to === "RESOLVED" && req.reportedById !== user.id) {
    void sendPushToUser(req.reportedById, {
      title: `Resolved: ${req.title}`,
      body: input.resolutionNote?.slice(0, 120) || "Marked resolved",
      url: `/maintenance/${input.id}`,
      tag: `maint-${input.id}`,
      category: "maintenance",
    });
  }

  revalidatePath("/maintenance");
  revalidatePath(`/maintenance/${input.id}`);
  return { ok: true };
}
