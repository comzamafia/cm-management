import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { prisma } from "./prisma";

// Phase 1 lightweight auth: a cookie holds the current user's id. No passwords yet.
// This is a deliberate seam — swap for real auth (OAuth/credentials) later without
// touching call sites that depend on getCurrentUser()/requireRole().

export const CURRENT_USER_COOKIE = "cm_uid";

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function getCurrentUser() {
  const store = await cookies();
  const uid = store.get(CURRENT_USER_COOKIE)?.value;
  if (!uid) return null;
  return prisma.user.findUnique({ where: { id: uid }, include: { location: true } });
}

/** Roles ranked by privilege (higher index = more power). */
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

/** True if a manager-and-above role; can create/assign/verify within scope. */
export function isManager(role: Role): boolean {
  return atLeast(role, Role.STORE_MANAGER);
}

/**
 * Location ids a user may see/act on.
 * - OWNER / AREA_MANAGER: all locations (AREA scope simplified to all for Phase 1).
 * - everyone else: their own location only.
 * Returns null to mean "all locations" (no filter).
 */
export async function scopedLocationIds(user: {
  role: Role;
  locationId: string | null;
}): Promise<string[] | null> {
  if (user.role === Role.OWNER || user.role === Role.AREA_MANAGER) return null;
  return user.locationId ? [user.locationId] : [];
}

/** Build a Prisma `where` location filter from a user's scope. */
export async function locationScopeWhere(user: {
  role: Role;
  locationId: string | null;
}): Promise<{ locationId?: { in: string[] } }> {
  const ids = await scopedLocationIds(user);
  if (ids === null) return {};
  return { locationId: { in: ids } };
}
