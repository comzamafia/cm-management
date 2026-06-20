"use server";

import { revalidatePath } from "next/cache";
import { NoteColor, Role } from "@prisma/client";
import { prisma } from "./prisma";
import { getCurrentUser } from "./auth";
import { hasGlobalScope } from "./rules";

export type ActionResult = { ok: boolean; error?: string };

export type PersonNoteItem = {
  id: string;
  title: string | null;
  body: string;
  color: NoteColor;
  createdAt: Date;
  author: { id: string; name: string };
};

// Sticky notes are private management notes — only OWNER / AREA_MANAGER may
// read or write them. Anyone below that never sees the section at all.
function canAccessNotes(role: Role): boolean {
  return hasGlobalScope(role);
}

/** Notes pinned to a person's profile (newest first). Gated to OWNER/AREA_MANAGER. */
export async function getPersonNotes(subjectId: string): Promise<PersonNoteItem[]> {
  const user = await getCurrentUser();
  if (!user || !canAccessNotes(user.role)) return [];

  return prisma.personNote.findMany({
    where: { subjectId },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true } } },
  });
}

export async function addPersonNote(
  subjectId: string,
  input: { title?: string; body: string; color?: NoteColor },
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!canAccessNotes(user.role)) return { ok: false, error: "Owner / Area Manager only" };

  const body = input.body.trim();
  if (!body) return { ok: false, error: "Note cannot be empty" };
  if (body.length > 2000) return { ok: false, error: "Note too long (max 2000 chars)" };

  const subject = await prisma.user.findUnique({
    where: { id: subjectId },
    select: { id: true, locationId: true },
  });
  if (!subject) return { ok: false, error: "Person not found" };

  await prisma.$transaction(async (tx) => {
    await tx.personNote.create({
      data: {
        subjectId,
        authorId: user.id,
        title: input.title?.trim() || null,
        body,
        color: input.color ?? "YELLOW",
      },
    });
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "person_note.added",
        entity: "User",
        entityId: subjectId,
        locationId: subject.locationId,
        meta: { excerpt: body.slice(0, 80) },
      },
    });
  });

  revalidatePath(`/dashboard/who/${subjectId}`);
  return { ok: true };
}

export async function deletePersonNote(noteId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!canAccessNotes(user.role)) return { ok: false, error: "Owner / Area Manager only" };

  const note = await prisma.personNote.findUnique({ where: { id: noteId } });
  if (!note) return { ok: false, error: "Note not found" };
  // Author may delete their own; OWNER may delete any.
  if (note.authorId !== user.id && user.role !== Role.OWNER) {
    return { ok: false, error: "Only the author or an owner can delete this note" };
  }

  await prisma.personNote.delete({ where: { id: noteId } });
  revalidatePath(`/dashboard/who/${note.subjectId}`);
  return { ok: true };
}
