"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getCurrentUser, isManager } from "./auth";
import { dayBoundsTZ } from "./time";
import type { ActionResult } from "./tasks";

/** Resolve a "YYYY-MM-DD" string (or undefined = today) to a representative instant. */
function dayAnchor(dayStr?: string): Date {
  if (dayStr && /^\d{4}-\d{2}-\d{2}$/.test(dayStr)) {
    // Noon UTC keeps the date on the intended local calendar day in most timezones.
    return new Date(`${dayStr}T12:00:00.000Z`);
  }
  return new Date();
}

/** Notes the current user logged on a given local day (default: today), newest first. */
export async function getNotesForDay(userId: string, dayStr?: string) {
  const { start, end } = dayBoundsTZ(dayAnchor(dayStr));
  return prisma.dailyNote.findMany({
    where: { userId, createdAt: { gte: start, lt: end } },
    orderBy: { createdAt: "desc" },
  });
}

export async function addNote(body: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Note cannot be empty" };
  if (trimmed.length > 2000) return { ok: false, error: "Note is too long (max 2000 chars)" };

  await prisma.dailyNote.create({
    data: { userId: user.id, locationId: user.locationId ?? null, body: trimmed },
  });

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteNote(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const note = await prisma.dailyNote.findUnique({ where: { id } });
  if (!note) return { ok: false, error: "Note not found" };
  // Author may always delete; managers may delete within scope.
  if (note.userId !== user.id && !isManager(user.role)) {
    return { ok: false, error: "Not authorized" };
  }

  await prisma.dailyNote.delete({ where: { id } });
  revalidatePath("/dashboard");
  return { ok: true };
}
