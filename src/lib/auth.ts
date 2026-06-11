import { getSession } from "./session";
import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { scopedLocationIdsFor } from "./rules";

// Re-export pure RBAC helpers — logic lives in ./rules (unit-tested, no DB deps).
export { RANK, rankOf, atLeast, isManager } from "./rules";

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.userId) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    include: { location: true },
  });
}

export async function scopedLocationIds(user: {
  role: Role;
  locationId: string | null;
}): Promise<string[] | null> {
  return scopedLocationIdsFor(user);
}

export async function locationScopeWhere(user: {
  role: Role;
  locationId: string | null;
}): Promise<{ locationId?: { in: string[] } }> {
  const ids = scopedLocationIdsFor(user);
  if (ids === null) return {};
  return { locationId: { in: ids } };
}
