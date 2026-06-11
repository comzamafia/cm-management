"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getCurrentUser } from "./auth";
import type { ActionResult } from "./tasks";

export async function updateMyProfile(input: {
  name: string;
  phone?: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!input.name.trim()) return { ok: false, error: "Name is required" };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
    },
  });

  revalidatePath("/profile");
  revalidatePath("/people");
  return { ok: true };
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (input.newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }

  const { compare, hash } = await import("bcryptjs");
  const fullUser = await prisma.user.findUnique({ where: { id: user.id } });

  if (!fullUser?.passwordHash) {
    return { ok: false, error: "No password set — contact your manager" };
  }

  const valid = await compare(input.currentPassword, fullUser.passwordHash);
  if (!valid) return { ok: false, error: "Current password is incorrect" };

  const newHash = await hash(input.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });

  return { ok: true };
}
