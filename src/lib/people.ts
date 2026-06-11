"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { logActivity } from "./activity";
import { getCurrentUser, isManager } from "./auth";
import type { ActionResult } from "./tasks";

/** Add a team member. The email lets them sign in with Google later and inherit this account. */
export async function addPerson(input: {
  name: string;
  email: string;
  role: Role;
  locationId?: string | null;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role)) return { ok: false, error: "Only managers can add people" };
  if (!input.name.trim()) return { ok: false, error: "Name is required" };

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) return { ok: false, error: "A valid email is required" };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "Someone with that email already exists" };

  await prisma.$transaction(async (tx) => {
    const person = await tx.user.create({
      data: {
        name: input.name.trim(),
        email,
        role: input.role,
        locationId: input.locationId ?? null,
        status: "ACTIVE",
      },
    });
    await logActivity(tx, {
      userId: user.id,
      action: "user.created",
      entity: "User",
      entityId: person.id,
      locationId: input.locationId ?? null,
      meta: { name: person.name, role: person.role },
    });
  });

  revalidatePath("/people");
  revalidatePath("/board");
  return { ok: true };
}

export async function updatePerson(input: {
  id: string;
  name: string;
  email: string;
  role: Role;
  locationId: string | null;
  phone: string | null;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role)) return { ok: false, error: "Only managers can edit people" };
  if (!input.name.trim()) return { ok: false, error: "Name is required" };

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) return { ok: false, error: "A valid email is required" };

  const conflict = await prisma.user.findFirst({
    where: { email, NOT: { id: input.id } },
  });
  if (conflict) return { ok: false, error: "Another user already has that email" };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.id },
      data: {
        name: input.name.trim(),
        email,
        role: input.role,
        locationId: input.locationId ?? null,
        phone: input.phone?.trim() || null,
      },
    });
    await logActivity(tx, {
      userId: user.id,
      action: "user.updated",
      entity: "User",
      entityId: input.id,
      locationId: input.locationId ?? null,
      meta: { name: input.name.trim(), role: input.role },
    });
  });

  revalidatePath("/people");
  return { ok: true };
}

export async function resetPersonPassword(
  id: string,
  newPassword: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role)) return { ok: false, error: "Only managers can reset passwords" };
  if (newPassword.length < 8) return { ok: false, error: "Password must be at least 8 characters" };

  const { hash } = await import("bcryptjs");
  const passwordHash = await hash(newPassword, 12);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  revalidatePath("/people");
  return { ok: true };
}

export async function setPersonStatus(
  id: string,
  status: "ACTIVE" | "INACTIVE",
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!isManager(user.role)) return { ok: false, error: "Only managers can change people" };
  if (id === user.id) return { ok: false, error: "You cannot deactivate yourself" };

  await prisma.user.update({ where: { id }, data: { status } });
  revalidatePath("/people");
  return { ok: true };
}
