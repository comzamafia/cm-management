"use server";

import { revalidatePath } from "next/cache";
import { Frequency, Priority } from "@prisma/client";
import { prisma } from "./prisma";
import { logActivity } from "./activity";
import { createNotification } from "./notifications";
import { getCurrentUser, isManager, locationScopeWhere, scopedLocationIds } from "./auth";
import { startOfDayTZ, atLocalHourTZ, localHour, localWeekday, localDayOfMonth } from "./time";
import type { ActionResult } from "./tasks";

// ── Template CRUD ────────────────────────────────────────────────────────────

export async function createChecklistTemplate(input: {
  name: string;
  frequency: Frequency;
  items: string[];       // one line per checklist item
  locationId?: string;   // null = company-wide
  autoGenerateHour: number;
  weekDay?: number;
  monthDay?: number;
  priority: Priority;
  department?: string;
  proofRequired: boolean;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role)) return { ok: false, error: "Only managers can create templates" };

  const cleanItems = input.items.map((i) => i.trim()).filter(Boolean);
  if (!input.name.trim()) return { ok: false, error: "Name is required" };
  if (cleanItems.length === 0) return { ok: false, error: "At least one item is required" };

  await prisma.checklistTemplate.create({
    data: {
      name: input.name.trim(),
      frequency: input.frequency,
      items: cleanItems,
      locationId: input.locationId || null,
      autoGenerateHour: input.autoGenerateHour,
      weekDay: input.weekDay ?? null,
      monthDay: input.monthDay ?? null,
      priority: input.priority,
      department: input.department?.trim() || null,
      proofRequired: input.proofRequired,
      createdById: user.id,
    },
  });

  revalidatePath("/checklists");
  return { ok: true };
}

/** Materialize today's due checklist tasks now (managers). Used by the dashboard. */
export async function generateNow(): Promise<ActionResult & { tasksCreated?: number }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role) && user.role !== "SHIFT_LEAD")
    return { ok: false, error: "Managers only" };

  const res = await generateDueChecklists(new Date(), true);
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  return { ok: true, tasksCreated: res.tasksCreated };
}

export async function toggleTemplate(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role)) return { ok: false, error: "Managers only" };

  const tpl = await prisma.checklistTemplate.findUnique({ where: { id } });
  if (!tpl) return { ok: false, error: "Template not found" };

  await prisma.checklistTemplate.update({ where: { id }, data: { active: !tpl.active } });
  revalidatePath("/checklists");
  return { ok: true };
}

// ── Generation ───────────────────────────────────────────────────────────────

/**
 * Core generation logic: run all due templates for the given UTC hour.
 * Called by the cron API route and by "Generate Now" (force=true skips hour check).
 * Returns the count of tasks created.
 */
export async function generateDueChecklists(
  nowUtc: Date = new Date(),
  force = false,
): Promise<{ tasksCreated: number; templatesRun: number }> {
  const currentHour = localHour(nowUtc);     // local (Toronto) hour
  const currentDay = localWeekday(nowUtc);   // 0-6 local
  const currentDate = localDayOfMonth(nowUtc); // 1-31 local

  // Local midnight today — used to detect if already generated today.
  const todayStart = startOfDayTZ(nowUtc);

  const templates = await prisma.checklistTemplate.findMany({
    where: { active: true },
    include: { location: true },
  });

  let tasksCreated = 0;
  let templatesRun = 0;

  for (const tpl of templates) {
    // Hour gate — skip if it's not yet time (unless forced).
    if (!force && currentHour < tpl.autoGenerateHour) continue;

    // Frequency gate.
    if (tpl.frequency === Frequency.WEEKLY && tpl.weekDay !== null && tpl.weekDay !== currentDay) continue;
    if (tpl.frequency === Frequency.MONTHLY && tpl.monthDay !== null && tpl.monthDay !== currentDate) continue;

    // Determine target locations.
    const targetLocations = tpl.locationId
      ? await prisma.location.findMany({ where: { id: tpl.locationId } })
      : await prisma.location.findMany();

    for (const loc of targetLocations) {
      // Idempotency: skip if already generated for this template+location today.
      const alreadyDone = await prisma.checklistGeneration.findFirst({
        where: {
          templateId: tpl.id,
          locationId: loc.id,
          generatedAt: { gte: todayStart },
        },
      });
      if (alreadyDone) continue;

      // Find the manager of this location to use as assigner.
      const mgr = await prisma.user.findFirst({
        where: {
          OR: [{ id: loc.managerId ?? "" }, { locationId: loc.id, role: "STORE_MANAGER" }],
        },
      });
      const assignerId = mgr?.id ?? tpl.createdById;

      const items = tpl.items as string[];
      // Due at 9pm local (end of the operating day) so it counts as "today" locally.
      const dueAt = atLocalHourTZ(nowUtc, 21);

      const createdTaskIds: string[] = [];

      await prisma.$transaction(async (tx) => {
        for (const item of items) {
          // Single-task templates (name === item) don't need the "[name]" prefix.
          const title = item === tpl.name ? item : `[${tpl.name}] ${item}`;
          const task = await tx.task.create({
            data: {
              title,
              description: `Auto-generated from checklist template "${tpl.name}"`,
              type: "RECURRING",
              priority: tpl.priority,
              locationId: loc.id,
              assignerId,
              assigneeId: tpl.assigneeId ?? null,
              categoryId: tpl.categoryId ?? null,
              department: tpl.department,
              dueAt,
              proofRequired: tpl.proofRequired,
            },
          });
          createdTaskIds.push(task.id);

          await logActivity(tx, {
            userId: assignerId,
            action: "task.created",
            entity: "Task",
            entityId: task.id,
            locationId: loc.id,
            meta: { title: task.title, source: "checklist", templateId: tpl.id },
          });
        }

        await tx.checklistGeneration.create({
          data: {
            templateId: tpl.id,
            locationId: loc.id,
            taskIds: createdTaskIds,
          },
        });

        // Notify the location manager.
        if (mgr) {
          await createNotification(tx, {
            userId: mgr.id,
            type: "CHECKLIST_GENERATED",
            title: `Checklist generated: ${tpl.name}`,
            body: `${items.length} task(s) created for ${loc.name}.`,
            entityId: tpl.id,
            entityType: "ChecklistTemplate",
          });
        }
      });

      tasksCreated += items.length;
      templatesRun++;
    }
  }

  return { tasksCreated, templatesRun };
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getChecklistTemplates() {
  const user = await getCurrentUser();
  if (!user) return [];

  const scope = await locationScopeWhere(user);

  // OWNER/AREA_MANAGER: scope={} → show all templates.
  // Store-scoped: show company-wide (locationId IS NULL) + templates for their location.
  const where = scope.locationId
    ? { OR: [{ locationId: null as string | null }, { locationId: { in: scope.locationId.in } }] }
    : {};

  return prisma.checklistTemplate.findMany({
    where,
    include: {
      location: true,
      createdBy: true,
      assignee: { select: { id: true, name: true } },
      _count: { select: { generations: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function assignChecklistTemplate(
  templateId: string,
  assigneeId: string | null,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !isManager(user.role)) return { ok: false, error: "Unauthorized" };

  await prisma.checklistTemplate.update({
    where: { id: templateId },
    data: { assigneeId },
  });

  revalidatePath("/checklists");
  return { ok: true };
}

export async function getScopedLocations() {
  const user = await getCurrentUser();
  if (!user) return [];
  const ids = await scopedLocationIds(user);
  return prisma.location.findMany({
    where: ids ? { id: { in: ids } } : {},
    orderBy: { name: "asc" },
  });
}
