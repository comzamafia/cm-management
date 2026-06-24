import { Role, TaskStatus } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Pure business rules — NO "use server", NO Prisma, NO NextAuth imports.
// This module is the single source of truth for RBAC ranking, location scope,
// and task status transitions, and is fully unit-testable without a database.
// ─────────────────────────────────────────────────────────────────────────────

// ── Role ranking (RBAC) ──────────────────────────────────────────────────────

export const RANK: Role[] = [
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

/** True if `role` is at least as senior as `min`. */
export function atLeast(role: Role, min: Role): boolean {
  return rankOf(role) >= rankOf(min);
}

/** Manager = STORE_MANAGER and above (can create/assign/verify in scope). */
export function isManager(role: Role): boolean {
  return atLeast(role, Role.STORE_MANAGER);
}

/**
 * Compliance-support role: a single-purpose account that only works the
 * Compliance page. It is intentionally NOT part of the RANK hierarchy, so
 * isManager()/hasGlobalScope() return false for it.
 */
export function isComplianceRole(role: Role): boolean {
  return role === Role.COMPLIANCE;
}

/** Who may create / edit / mark-done compliance schedules. */
export function canManageCompliance(role: Role): boolean {
  return isManager(role) || role === Role.SHIFT_LEAD || isComplianceRole(role);
}

// ── Location scope ───────────────────────────────────────────────────────────

/** Roles that see every location (no location filter applied). */
export function hasGlobalScope(role: Role): boolean {
  return role === Role.OWNER || role === Role.AREA_MANAGER;
}

/**
 * Location ids a user may read/act on.
 *  - null  → unrestricted (all locations)
 *  - []    → no scope (e.g. a store-scoped user with no location assigned)
 *  - [...] → the specific allowed location ids
 */
export function scopedLocationIdsFor(user: {
  role: Role;
  locationId: string | null;
}): string[] | null {
  if (hasGlobalScope(user.role)) return null;
  // Compliance support works across every branch's schedules.
  if (isComplianceRole(user.role)) return null;
  return user.locationId ? [user.locationId] : [];
}

/** Whether a user may act on a given location. */
export function isLocationInScope(
  user: { role: Role; locationId: string | null },
  locationId: string,
): boolean {
  const ids = scopedLocationIdsFor(user);
  return ids === null || ids.includes(locationId);
}

// ── Task status transitions ──────────────────────────────────────────────────

/** Allowed status transitions (server-enforced). OVERDUE is derived, never a manual target. */
export const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  PENDING: ["IN_PROGRESS", "DONE"],
  IN_PROGRESS: ["DONE", "PENDING"],
  DONE: ["VERIFIED", "IN_PROGRESS"], // verify, or reopen/reject
  VERIFIED: [], // terminal
  OVERDUE: ["IN_PROGRESS", "DONE"],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Only STORE_MANAGER+ may move a task to VERIFIED. */
export function canVerify(role: Role): boolean {
  return isManager(role);
}

/**
 * Effective status used for validation/display: a task past its due date that
 * isn't closed is surfaced as OVERDUE. Mirrors the dashboard's derived status.
 */
export function deriveStatus(
  status: TaskStatus,
  dueAt: Date | null,
  now: Date = new Date(),
): TaskStatus {
  if (status === "DONE" || status === "VERIFIED") return status;
  if (dueAt && dueAt.getTime() < now.getTime()) return "OVERDUE";
  return status;
}

export function isOverdue(dueAt: Date | null, status: TaskStatus, now: Date = new Date()): boolean {
  return deriveStatus(status, dueAt, now) === "OVERDUE";
}

/**
 * Whether a DONE transition must be blocked for missing photo proof.
 * Only relevant when moving to DONE on a proof-required task.
 */
export function proofMissing(
  next: TaskStatus,
  proofRequired: boolean,
  photoCount: number,
): boolean {
  return next === "DONE" && proofRequired && photoCount === 0;
}
