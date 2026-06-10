import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { prisma } from "./prisma";

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email },
    include: { location: true },
  });
}

const RANK: Role[] = [
  Role.NEW_HIRE,
  Role.EMPLOYEE,
  Role.SHIFT_LEAD,
  Role.STORE_MANAGER,
  Role.AREA_MANAGER,
  Role.OWNER,
];

export function rankOf(role: Role): number {
  return RANK.indexOf(role);
}

export function atLeast(role: Role, min: Role): boolean {
  return rankOf(role) >= rankOf(min);
}

export function isManager(role: Role): boolean {
  return atLeast(role, Role.STORE_MANAGER);
}

export async function scopedLocationIds(user: {
  role: Role;
  locationId: string | null;
}): Promise<string[] | null> {
  if (user.role === Role.OWNER || user.role === Role.AREA_MANAGER) return null;
  return user.locationId ? [user.locationId] : [];
}

export async function locationScopeWhere(user: {
  role: Role;
  locationId: string | null;
}): Promise<{ locationId?: { in: string[] } }> {
  const ids = await scopedLocationIds(user);
  if (ids === null) return {};
  return { locationId: { in: ids } };
}
