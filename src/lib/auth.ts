import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { scopedLocationIdsFor } from "./rules";

// Re-export the pure RBAC helpers so existing `@/lib/auth` imports keep working.
// The logic itself lives in ./rules (unit-tested, no NextAuth/Prisma deps).
export { RANK, rankOf, atLeast, isManager } from "./rules";

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email },
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
