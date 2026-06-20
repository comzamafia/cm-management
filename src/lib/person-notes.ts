"use server";

import { revalidatePath } from "next/cache";
import { NoteColor, Role } from "@prisma/client";
import { prisma } from "./prisma";
import { getCurrentUser } from "./auth";
import { hasGlobalScope } from "./rules";

export type ActionResult = { ok: boolean; error?: string };

export type StickyNoteItem = {
  id: string;
  title: string | null;
  body: string;
  color: NoteColor;
  createdAt: Date;
  author: { id: string; name: string };
};

type Viewer = { id: string; role: Role };

// Sticky notes live on a person's dashboard. The dashboard owner manages their
// own notes; OWNER / AREA_MANAGER have owner-like rights over anyone's notes
// (view, add, delete) — e.g. to leave a note on a teammate's board.
export async function canManageNotesFor(viewer: Viewer, subjectId: string): Promise<boolean> {
  return viewer.id === subjectId || hasGlobalScope(viewer.role);
}

/** Notes pinned to a person's dashboard (newest first). */
export async function getStickyNotes(subjectId: string): Promise<StickyNoteItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  if (user.id !== subjectId && !hasGlobalScope(user.role)) return [];

  return prisma.personNote.findMany({
    where: { subjectId },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true } } },
  });
}

export async function addStickyNote(
  subjectId: string,
  input: { title?: string; body: string; color?: NoteColor },
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (user.id !== subjectId && !hasGlobalScope(user.role)) {
    return { ok: false, error: "Not allowed to add notes here" };
  }

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
        action: "sticky_note.added",
        entity: "User",
        entityId: subjectId,
        locationId: subject.locationId,
        meta: { excerpt: body.slice(0, 80) },
      },
    });
  });

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteStickyNote(noteId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const note = await prisma.personNote.findUnique({ where: { id: noteId } });
  if (!note) return { ok: false, error: "Note not found" };

  // The dashboard owner, the author, or an OWNER/AREA_MANAGER may delete.
  const allowed =
    note.subjectId === user.id || note.authorId === user.id || hasGlobalScope(user.role);
  if (!allowed) return { ok: false, error: "Not allowed to delete this note" };

  await prisma.personNote.delete({ where: { id: noteId } });
  revalidatePath("/dashboard");
  return { ok: true };
}
