"use server";

import { revalidatePath } from "next/cache";
import { AttachmentType, Priority, ProjectStatus, Role } from "@prisma/client";
import { prisma } from "./prisma";
import { logActivity } from "./activity";
import { getCurrentUser, isManager, locationScopeWhere } from "./auth";
import { isOverdue } from "./labels";
import type { ActionResult } from "./tasks";

type ScopeUser = { role: Role; locationId: string | null };

/**
 * Everything the Projects board needs: projects (with owner + task rollups),
 * assignable users, and portfolio KPIs. Read-only — safe in a server component.
 */
export async function getProjects(user: ScopeUser) {
  const scope = await locationScopeWhere(user);

  const [projects, users, locations] = await Promise.all([
    prisma.project.findMany({
      where: scope,
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: {
        owner: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        tasks: {
          orderBy: [{ position: "asc" }, { dueAt: "asc" }],
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueAt: true,
            assignee: { select: { id: true, name: true } },
          },
        },
        attachments: {
          orderBy: { createdAt: "desc" },
          select: { id: true, url: true, name: true, type: true },
        },
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

  const rows = projects.map((p) => {
    const total = p.tasks.length;
    const done = p.tasks.filter(
      (t) => t.status === "DONE" || t.status === "VERIFIED",
    ).length;
    const openOverdue = p.tasks.filter((t) => isOverdue(t.dueAt, t.status)).length;
    return {
      id: p.id,
      name: p.name,
      client: p.client,
      status: p.status,
      priority: p.priority,
      color: p.color,
      ownerId: p.ownerId,
      ownerName: p.owner?.name ?? null,
      locationId: p.locationId,
      locationName: p.location?.name ?? null,
      budget: p.budget,
      startAt: p.startAt ? p.startAt.toISOString() : null,
      dueAt: p.dueAt ? p.dueAt.toISOString() : null,
      overdue: isOverdue(p.dueAt, p.status === "COMPLETED" ? "DONE" : "PENDING"),
      taskTotal: total,
      taskDone: done,
      taskOverdue: openOverdue,
      progress: total === 0 ? 0 : Math.round((done / total) * 100),
      subitems: p.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueAt: t.dueAt ? t.dueAt.toISOString() : null,
        overdue: isOverdue(t.dueAt, t.status),
        assigneeId: t.assignee?.id ?? null,
        assigneeName: t.assignee?.name ?? null,
      })),
      files: p.attachments.map((a) => ({
        id: a.id,
        url: a.url,
        name: a.name,
        type: a.type,
      })),
    };
  });

  const totals = {
    total: rows.length,
    notStarted: rows.filter((r) => r.status === "NOT_STARTED").length,
    inProgress: rows.filter((r) => r.status === "IN_PROGRESS").length,
    onHold: rows.filter((r) => r.status === "ON_HOLD").length,
    completed: rows.filter((r) => r.status === "COMPLETED").length,
    cancelled: rows.filter((r) => r.status === "CANCELLED").length,
    overdue: rows.filter((r) => r.overdue).length,
  };

  return { rows, users, locations, totals };
}

export type ProjectRow = Awaited<ReturnType<typeof getProjects>>["rows"][number];

type EditableUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
type EditableProject = NonNullable<Awaited<ReturnType<typeof prisma.project.findUnique>>>;
type Editable =
  | { ok: false; error: string }
  | { ok: true; user: EditableUser; project: EditableProject };

/** Confirm the project exists and the user may act on it (location scope + manager). */
async function loadEditable(id: string): Promise<Editable> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role) && user.role !== "SHIFT_LEAD")
    return { ok: false, error: "Only managers can edit projects" };

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return { ok: false, error: "Project not found" };

  const scope = await locationScopeWhere(user);
  if (scope.locationId && !scope.locationId.in.includes(project.locationId))
    return { ok: false, error: "Out of your location scope" };

  return { ok: true, user, project };
}

export async function createProject(input: {
  name: string;
  client?: string | null;
  locationId?: string | null;
  ownerId?: string | null;
  status?: ProjectStatus;
  priority?: Priority;
  budget?: number | null;
  startAt?: string | null;
  dueAt?: string | null;
  color?: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role) && user.role !== "SHIFT_LEAD")
    return { ok: false, error: "Only managers can create projects" };
  if (!input.name.trim()) return { ok: false, error: "Name is required" };

  // Default to the manager's own location; owners covering all must pass one.
  const locationId = input.locationId ?? user.locationId;
  if (!locationId) return { ok: false, error: "Pick a location for this project" };

  const count = await prisma.project.count();
  await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name: input.name.trim(),
        client: input.client?.trim() || null,
        status: input.status ?? "NOT_STARTED",
        priority: input.priority ?? "MEDIUM",
        color: input.color || "#440E48",
        locationId,
        ownerId: input.ownerId || null,
        budget: input.budget ?? null,
        startAt: input.startAt ? new Date(input.startAt) : null,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        position: count,
        createdById: user.id,
      },
    });
    await logActivity(tx, {
      userId: user.id,
      action: "project.created",
      entity: "Project",
      entityId: project.id,
      locationId,
      meta: { name: project.name, client: project.client },
    });
  });

  revalidatePath("/projects");
  return { ok: true };
}

/** Quick-add a bare project directly into a status group (monday-style + row). */
export async function quickAddProject(
  name: string,
  status: ProjectStatus,
): Promise<ActionResult> {
  return createProject({ name, status });
}

export async function changeProjectStatus(
  id: string,
  status: ProjectStatus,
): Promise<ActionResult> {
  const res = await loadEditable(id);
  if (!res.ok) return { ok: false, error: res.error };
  const { user, project } = res;

  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id }, data: { status } });
    await logActivity(tx, {
      userId: user.id,
      action: "project.status_changed",
      entity: "Project",
      entityId: id,
      locationId: project.locationId,
      meta: { from: project.status, to: status },
    });
  });

  revalidatePath("/projects");
  return { ok: true };
}

export async function assignProjectOwner(
  id: string,
  ownerId: string,
): Promise<ActionResult> {
  const res = await loadEditable(id);
  if (!res.ok) return { ok: false, error: res.error };
  const { user, project } = res;

  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id }, data: { ownerId: ownerId || null } });
    await logActivity(tx, {
      userId: user.id,
      action: "project.owner_changed",
      entity: "Project",
      entityId: id,
      locationId: project.locationId,
      meta: { ownerId: ownerId || null },
    });
  });

  revalidatePath("/projects");
  return { ok: true };
}

export async function setProjectPriority(
  id: string,
  priority: Priority,
): Promise<ActionResult> {
  const res = await loadEditable(id);
  if (!res.ok) return { ok: false, error: res.error };
  const { user, project } = res;

  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id }, data: { priority } });
    await logActivity(tx, {
      userId: user.id,
      action: "project.priority_changed",
      entity: "Project",
      entityId: id,
      locationId: project.locationId,
      meta: { from: project.priority, to: priority },
    });
  });

  revalidatePath("/projects");
  return { ok: true };
}

/** Update the timeline. Pass ISO strings or null to clear. */
export async function setProjectTimeline(
  id: string,
  startAt: string | null,
  dueAt: string | null,
): Promise<ActionResult> {
  const res = await loadEditable(id);
  if (!res.ok) return { ok: false, error: res.error };
  const { user, project } = res;

  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id },
      data: {
        startAt: startAt ? new Date(startAt) : null,
        dueAt: dueAt ? new Date(dueAt) : null,
      },
    });
    await logActivity(tx, {
      userId: user.id,
      action: "project.timeline_changed",
      entity: "Project",
      entityId: id,
      locationId: project.locationId,
      meta: { startAt, dueAt },
    });
  });

  revalidatePath("/projects");
  return { ok: true };
}

export async function setProjectBudget(
  id: string,
  budget: number | null,
): Promise<ActionResult> {
  const res = await loadEditable(id);
  if (!res.ok) return { ok: false, error: res.error };
  const { user, project } = res;

  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id }, data: { budget } });
    await logActivity(tx, {
      userId: user.id,
      action: "project.budget_changed",
      entity: "Project",
      entityId: id,
      locationId: project.locationId,
      meta: { budget },
    });
  });

  revalidatePath("/projects");
  return { ok: true };
}

export async function setProjectClient(
  id: string,
  client: string,
): Promise<ActionResult> {
  const res = await loadEditable(id);
  if (!res.ok) return { ok: false, error: res.error };
  const { user, project } = res;

  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id }, data: { client: client.trim() || null } });
    await logActivity(tx, {
      userId: user.id,
      action: "project.client_changed",
      entity: "Project",
      entityId: id,
      locationId: project.locationId,
      meta: { client: client.trim() || null },
    });
  });

  revalidatePath("/projects");
  return { ok: true };
}

export async function renameProject(id: string, name: string): Promise<ActionResult> {
  const res = await loadEditable(id);
  if (!res.ok) return { ok: false, error: res.error };
  const { user, project } = res;
  if (!name.trim()) return { ok: false, error: "Name is required" };

  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id }, data: { name: name.trim() } });
    await logActivity(tx, {
      userId: user.id,
      action: "project.renamed",
      entity: "Project",
      entityId: id,
      locationId: project.locationId,
      meta: { from: project.name, to: name.trim() },
    });
  });

  revalidatePath("/projects");
  return { ok: true };
}

/** Delete a project. Its tasks are kept but detached (projectId → null). */
export async function deleteProject(id: string): Promise<ActionResult> {
  const res = await loadEditable(id);
  if (!res.ok) return { ok: false, error: res.error };
  const { user, project } = res;

  await prisma.$transaction(async (tx) => {
    await tx.task.updateMany({ where: { projectId: id }, data: { projectId: null } });
    await tx.project.delete({ where: { id } });
    await logActivity(tx, {
      userId: user.id,
      action: "project.deleted",
      entity: "Project",
      entityId: id,
      locationId: project.locationId,
      meta: { name: project.name },
    });
  });

  revalidatePath("/projects");
  return { ok: true };
}

/* ── Subitems: tasks that belong to a project (monday "subitems") ── */

/** Quick-add a task as a subitem of a project (inherits the project's location). */
export async function addProjectTask(
  projectId: string,
  title: string,
): Promise<ActionResult> {
  const res = await loadEditable(projectId);
  if (!res.ok) return { ok: false, error: res.error };
  const { user, project } = res;
  if (!title.trim()) return { ok: false, error: "Title is required" };

  const count = await prisma.task.count({ where: { projectId } });
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        title: title.trim(),
        type: "ONE_OFF",
        priority: project.priority,
        locationId: project.locationId,
        assignerId: user.id,
        assigneeId: project.ownerId,
        projectId,
        department: "Projects",
        position: count,
        proofRequired: false,
      },
    });
    await logActivity(tx, {
      userId: user.id,
      action: "task.created",
      entity: "Task",
      entityId: task.id,
      locationId: project.locationId,
      meta: { title: task.title, projectId },
    });
  });

  revalidatePath("/projects");
  return { ok: true };
}

/* ── Files: project-level attachments ── */

export async function addProjectFile(
  projectId: string,
  url: string,
  name?: string,
  type: AttachmentType = "DOC",
): Promise<ActionResult> {
  const res = await loadEditable(projectId);
  if (!res.ok) return { ok: false, error: res.error };
  const { user, project } = res;

  const clean = url.trim();
  if (!clean) return { ok: false, error: "File URL is required" };
  if (!/^https?:\/\//i.test(clean)) return { ok: false, error: "Enter a valid http(s) URL" };

  await prisma.$transaction(async (tx) => {
    const file = await tx.attachment.create({
      data: { projectId, url: clean, name: name?.trim() || null, type },
    });
    await logActivity(tx, {
      userId: user.id,
      action: "project.file_added",
      entity: "Project",
      entityId: projectId,
      locationId: project.locationId,
      meta: { attachmentId: file.id, url: clean },
    });
  });

  revalidatePath("/projects");
  return { ok: true };
}

export async function removeProjectFile(attachmentId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const file = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { project: { select: { id: true, locationId: true } } },
  });
  if (!file || !file.project) return { ok: false, error: "File not found" };

  const res = await loadEditable(file.project.id);
  if (!res.ok) return { ok: false, error: res.error };

  await prisma.$transaction(async (tx) => {
    await tx.attachment.delete({ where: { id: attachmentId } });
    await logActivity(tx, {
      userId: user.id,
      action: "project.file_removed",
      entity: "Project",
      entityId: file.project!.id,
      locationId: file.project!.locationId,
      meta: { attachmentId },
    });
  });

  revalidatePath("/projects");
  return { ok: true };
}
