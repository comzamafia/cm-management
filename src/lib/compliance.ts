"use server";

import { revalidatePath } from "next/cache";
import { ComplianceCategory, ComplianceInterval, Prisma, Priority } from "@prisma/client";
import { prisma } from "./prisma";
import { logActivity } from "./activity";
import { createNotification } from "./notifications";
import { getCurrentUser, isManager, locationScopeWhere, scopedLocationIds } from "./auth";
import {
  computeNextDue,
  complianceDaysUntil,
  deriveComplianceStatus,
  COMPLIANCE_CATEGORY_LABEL,
  COMPLIANCE_INTERVAL_LABEL,
} from "./labels";
import type { ActionResult } from "./tasks";

type Tx = Prisma.TransactionClient;

const REMINDER_THRESHOLDS = [14, 7, 3, 1];

function describe(s: {
  name: string;
  category: ComplianceCategory;
  interval: ComplianceInterval;
  vendor: string | null;
  estimatedCost: number | null;
  lastServiceDate: Date;
}): string {
  const parts = [
    `Recurring ${COMPLIANCE_INTERVAL_LABEL[s.interval].toLowerCase()} compliance service.`,
    `Last serviced: ${s.lastServiceDate.toISOString().slice(0, 10)}.`,
  ];
  if (s.vendor) parts.push(`Vendor: ${s.vendor}.`);
  if (s.estimatedCost != null) parts.push(`Est. cost: $${s.estimatedCost.toLocaleString()}.`);
  return parts.join(" ");
}

/** Create the Task that represents one service cycle and return its id. */
async function spawnCycleTask(
  tx: Tx,
  schedule: {
    id: string;
    name: string;
    category: ComplianceCategory;
    interval: ComplianceInterval;
    locationId: string;
    assigneeId: string | null;
    priority: Priority;
    vendor: string | null;
    estimatedCost: number | null;
    lastServiceDate: Date;
    nextDueDate: Date;
    createdById: string;
  },
  assignerId: string,
): Promise<string> {
  const task = await tx.task.create({
    data: {
      title: `[${COMPLIANCE_CATEGORY_LABEL[schedule.category]}] ${schedule.name}`,
      description: describe(schedule),
      type: "RECURRING",
      priority: schedule.priority,
      locationId: schedule.locationId,
      assignerId,
      assigneeId: schedule.assigneeId,
      department: "Compliance",
      complianceScheduleId: schedule.id,
      dueAt: schedule.nextDueDate,
      proofRequired: false,
    },
  });
  await logActivity(tx, {
    userId: assignerId,
    action: "task.created",
    entity: "Task",
    entityId: task.id,
    locationId: schedule.locationId,
    meta: { title: task.title, source: "compliance", scheduleId: schedule.id },
  });
  return task.id;
}

type EditableUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
type EditableSchedule = NonNullable<Awaited<ReturnType<typeof prisma.complianceSchedule.findUnique>>>;
type Editable =
  | { ok: false; error: string }
  | { ok: true; user: EditableUser; schedule: EditableSchedule };

async function loadEditable(id: string): Promise<Editable> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role) && user.role !== "SHIFT_LEAD")
    return { ok: false, error: "Only managers can manage compliance schedules" };
  const schedule = await prisma.complianceSchedule.findUnique({ where: { id } });
  if (!schedule) return { ok: false, error: "Schedule not found" };
  const ids = await scopedLocationIds(user);
  if (ids !== null && !ids.includes(schedule.locationId))
    return { ok: false, error: "Out of your location scope" };
  return { ok: true, user, schedule };
}

export async function createComplianceSchedule(input: {
  name: string;
  category: ComplianceCategory;
  interval: ComplianceInterval;
  locationId?: string | null;
  assigneeId?: string | null;
  vendor?: string | null;
  vendorContact?: string | null;
  priority?: Priority;
  estimatedCost?: number | null;
  notes?: string | null;
  lastServiceDate?: string | null; // ISO date; defaults to today
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role) && user.role !== "SHIFT_LEAD")
    return { ok: false, error: "Only managers can create compliance schedules" };
  if (!input.name.trim()) return { ok: false, error: "Name is required" };

  const locationId = input.locationId ?? user.locationId;
  if (!locationId) return { ok: false, error: "Pick a location" };
  const ids = await scopedLocationIds(user);
  if (ids !== null && !ids.includes(locationId))
    return { ok: false, error: "Out of your location scope" };

  const lastServiceDate = input.lastServiceDate ? new Date(input.lastServiceDate) : new Date();
  const nextDueDate = computeNextDue(lastServiceDate, input.interval);

  await prisma.$transaction(async (tx) => {
    const schedule = await tx.complianceSchedule.create({
      data: {
        name: input.name.trim(),
        category: input.category,
        interval: input.interval,
        locationId,
        assigneeId: input.assigneeId || null,
        vendor: input.vendor?.trim() || null,
        vendorContact: input.vendorContact?.trim() || null,
        priority: input.priority ?? "HIGH",
        estimatedCost: input.estimatedCost ?? null,
        notes: input.notes?.trim() || null,
        lastServiceDate,
        nextDueDate,
        createdById: user.id,
      },
    });
    const taskId = await spawnCycleTask(tx, schedule, user.id);
    await tx.complianceSchedule.update({ where: { id: schedule.id }, data: { currentTaskId: taskId } });
    await logActivity(tx, {
      userId: user.id,
      action: "compliance.created",
      entity: "ComplianceSchedule",
      entityId: schedule.id,
      locationId,
      meta: { name: schedule.name, category: schedule.category, nextDueDate },
    });
    if (input.assigneeId && input.assigneeId !== user.id) {
      await createNotification(tx, {
        userId: input.assigneeId,
        type: "TASK_ASSIGNED",
        title: "Compliance task assigned to you",
        body: `${schedule.name} — due ${nextDueDate.toISOString().slice(0, 10)}.`,
        entityId: taskId,
        entityType: "Task",
      });
    }
  });

  revalidatePath("/compliance");
  return { ok: true };
}

/** Internal: advance a schedule to its next cycle (shared by markServiced + task-completion roll). */
async function advanceSchedule(
  tx: Tx,
  scheduleId: string,
  doneDate: Date,
  assignerId: string,
  actualCost?: number | null,
) {
  const s = await tx.complianceSchedule.findUnique({ where: { id: scheduleId } });
  if (!s) return;
  const nextDueDate = computeNextDue(doneDate, s.interval);
  const spawn = { ...s, lastServiceDate: doneDate, nextDueDate };
  const newTaskId = await spawnCycleTask(tx, spawn, assignerId);
  await tx.complianceSchedule.update({
    where: { id: scheduleId },
    data: {
      lastServiceDate: doneDate,
      nextDueDate,
      remindersSent: [],
      lastOverdueAlert: null,
      lastCost: actualCost ?? s.lastCost,
      currentTaskId: newTaskId,
    },
  });
  await logActivity(tx, {
    userId: assignerId,
    action: "compliance.serviced",
    entity: "ComplianceSchedule",
    entityId: scheduleId,
    locationId: s.locationId,
    meta: { doneDate, nextDueDate, cost: actualCost ?? null },
  });
}

/** Record a service as done from the Compliance page: closes the current task and rolls forward. */
export async function markServiced(
  id: string,
  doneDateISO?: string | null,
  actualCost?: number | null,
): Promise<ActionResult> {
  const res = await loadEditable(id);
  if (!res.ok) return { ok: false, error: res.error };
  const { user, schedule } = res;
  const doneDate = doneDateISO ? new Date(doneDateISO) : new Date();

  await prisma.$transaction(async (tx) => {
    // Close the current cycle's task (if still open) without re-triggering the roll hook.
    if (schedule.currentTaskId) {
      await tx.task.update({ where: { id: schedule.currentTaskId }, data: { status: "DONE" } });
    }
    await advanceSchedule(tx, id, doneDate, user.id, actualCost);
  });

  revalidatePath("/compliance");
  revalidatePath("/tasks");
  return { ok: true };
}

/**
 * Called from changeTaskStatus when a compliance-linked task is completed via the
 * normal task flow. Guarded by currentTaskId so a later VERIFIED won't double-roll.
 */
export async function rollScheduleOnTaskDone(taskId: string, doneDate: Date, userId: string) {
  const schedule = await prisma.complianceSchedule.findFirst({
    where: { currentTaskId: taskId, active: true },
  });
  if (!schedule) return;
  await prisma.$transaction(async (tx) => {
    await advanceSchedule(tx, schedule.id, doneDate, userId);
  });
  revalidatePath("/compliance");
}

export async function updateComplianceSchedule(
  id: string,
  fields: {
    name?: string;
    category?: ComplianceCategory;
    interval?: ComplianceInterval;
    assigneeId?: string | null;
    vendor?: string | null;
    vendorContact?: string | null;
    priority?: Priority;
    estimatedCost?: number | null;
    notes?: string | null;
  },
): Promise<ActionResult> {
  const res = await loadEditable(id);
  if (!res.ok) return { ok: false, error: res.error };
  const { user, schedule } = res;

  await prisma.$transaction(async (tx) => {
    await tx.complianceSchedule.update({
      where: { id },
      data: {
        ...(fields.name != null ? { name: fields.name.trim() } : {}),
        ...(fields.category != null ? { category: fields.category } : {}),
        ...(fields.interval != null ? { interval: fields.interval } : {}),
        ...(fields.assigneeId !== undefined ? { assigneeId: fields.assigneeId || null } : {}),
        ...(fields.vendor !== undefined ? { vendor: fields.vendor?.trim() || null } : {}),
        ...(fields.vendorContact !== undefined ? { vendorContact: fields.vendorContact?.trim() || null } : {}),
        ...(fields.priority != null ? { priority: fields.priority } : {}),
        ...(fields.estimatedCost !== undefined ? { estimatedCost: fields.estimatedCost } : {}),
        ...(fields.notes !== undefined ? { notes: fields.notes?.trim() || null } : {}),
      },
    });
    await logActivity(tx, {
      userId: user.id,
      action: "compliance.updated",
      entity: "ComplianceSchedule",
      entityId: id,
      locationId: schedule.locationId,
      meta: { fields: Object.keys(fields) },
    });
  });

  revalidatePath("/compliance");
  return { ok: true };
}

export async function toggleComplianceActive(id: string): Promise<ActionResult> {
  const res = await loadEditable(id);
  if (!res.ok) return { ok: false, error: res.error };
  const { schedule } = res;
  await prisma.complianceSchedule.update({ where: { id }, data: { active: !schedule.active } });
  revalidatePath("/compliance");
  return { ok: true };
}

export async function deleteComplianceSchedule(id: string): Promise<ActionResult> {
  const res = await loadEditable(id);
  if (!res.ok) return { ok: false, error: res.error };
  const { user, schedule } = res;
  await prisma.$transaction(async (tx) => {
    // Detach spawned tasks (keep them as history); clear current link first.
    await tx.complianceSchedule.update({ where: { id }, data: { currentTaskId: null } });
    await tx.task.updateMany({ where: { complianceScheduleId: id }, data: { complianceScheduleId: null } });
    await tx.complianceSchedule.delete({ where: { id } });
    await logActivity(tx, {
      userId: user.id,
      action: "compliance.deleted",
      entity: "ComplianceSchedule",
      entityId: id,
      locationId: schedule.locationId,
      meta: { name: schedule.name },
    });
  });
  revalidatePath("/compliance");
  return { ok: true };
}

/** Scoped list for the Compliance page, with derived status + days-until. */
export async function getComplianceSchedules(user: { role: import("@prisma/client").Role; locationId: string | null }) {
  const scope = await locationScopeWhere(user);
  const [schedules, users, locations] = await Promise.all([
    prisma.complianceSchedule.findMany({
      where: scope,
      orderBy: { nextDueDate: "asc" },
      include: {
        location: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({
      where: { ...scope, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.location.findMany({
      where: scope.locationId ? { id: scope.locationId } : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows = schedules.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    interval: s.interval,
    locationId: s.locationId,
    locationName: s.location.name,
    assigneeId: s.assigneeId,
    assigneeName: s.assignee?.name ?? null,
    vendor: s.vendor,
    vendorContact: s.vendorContact,
    priority: s.priority,
    estimatedCost: s.estimatedCost,
    lastCost: s.lastCost,
    notes: s.notes,
    lastServiceDate: s.lastServiceDate.toISOString(),
    nextDueDate: s.nextDueDate.toISOString(),
    active: s.active,
    currentTaskId: s.currentTaskId,
    daysUntil: complianceDaysUntil(s.nextDueDate),
    status: s.active ? deriveComplianceStatus(s.nextDueDate) : ("UPCOMING" as const),
  }));

  const totals = {
    total: rows.length,
    overdue: rows.filter((r) => r.active && r.status === "OVERDUE").length,
    dueSoon: rows.filter((r) => r.active && r.status === "DUE_SOON").length,
    upcoming: rows.filter((r) => r.active && r.status === "UPCOMING").length,
  };

  return { rows, users, locations, totals };
}

export type ComplianceRow = Awaited<ReturnType<typeof getComplianceSchedules>>["rows"][number];

/**
 * Cron worker: send multi-step advance reminders (14/7/3/1 days) and throttled
 * overdue alerts for active schedules. De-duplicated via remindersSent + lastOverdueAlert.
 */
export async function runComplianceReminders(now: Date = new Date()): Promise<{
  dueSoonNotified: number;
  overdueNotified: number;
}> {
  const schedules = await prisma.complianceSchedule.findMany({
    where: { active: true },
    include: {
      location: { select: { name: true, managerId: true } },
      assignee: { select: { id: true, name: true } },
    },
  });

  let dueSoonNotified = 0;
  let overdueNotified = 0;
  const startToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  for (const s of schedules) {
    const days = complianceDaysUntil(s.nextDueDate, now);
    const recipients = new Set<string>();
    if (s.assigneeId) recipients.add(s.assigneeId);
    if (s.location.managerId) recipients.add(s.location.managerId);
    if (recipients.size === 0) continue;

    if (days >= 0) {
      const sent = Array.isArray(s.remindersSent) ? (s.remindersSent as number[]) : [];
      const crossed = REMINDER_THRESHOLDS.filter((t) => days <= t && !sent.includes(t));
      if (crossed.length > 0) {
        for (const uid of recipients) {
          await createNotification(prisma, {
            userId: uid,
            type: "COMPLIANCE_DUE_SOON",
            title: `Compliance due in ${days} day${days === 1 ? "" : "s"}`,
            body: `${s.name} at ${s.location.name} is due ${s.nextDueDate.toISOString().slice(0, 10)}${s.vendor ? ` — vendor: ${s.vendor}` : ""}.`,
            entityId: s.currentTaskId ?? s.id,
            entityType: s.currentTaskId ? "Task" : "ComplianceSchedule",
          });
        }
        await prisma.complianceSchedule.update({
          where: { id: s.id },
          data: { remindersSent: [...sent, ...crossed] },
        });
        dueSoonNotified++;
      }
    } else {
      // Overdue: at most one alert per day.
      const alertedToday = s.lastOverdueAlert && s.lastOverdueAlert >= startToday;
      if (!alertedToday) {
        for (const uid of recipients) {
          await createNotification(prisma, {
            userId: uid,
            type: "COMPLIANCE_OVERDUE",
            title: `Compliance OVERDUE: ${s.name}`,
            body: `${s.name} at ${s.location.name} was due ${s.nextDueDate.toISOString().slice(0, 10)} (${-days} day${days === -1 ? "" : "s"} ago)${s.vendor ? ` — vendor: ${s.vendor}` : ""}.`,
            entityId: s.currentTaskId ?? s.id,
            entityType: s.currentTaskId ? "Task" : "ComplianceSchedule",
          });
        }
        await prisma.complianceSchedule.update({ where: { id: s.id }, data: { lastOverdueAlert: now } });
        overdueNotified++;
      }
    }
  }

  return { dueSoonNotified, overdueNotified };
}
