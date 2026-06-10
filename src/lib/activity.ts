import type { Prisma, PrismaClient } from "@prisma/client";

// Every state-changing action MUST log here, inside the same transaction as the
// mutation. This is the immutable audit trail that powers the dashboard
// (Who / What / Where / When). Never write logs from the client.

export type ActivityInput = {
  userId: string;
  action: string; // e.g. "task.created", "task.status_changed"
  entity: string; // e.g. "Task"
  entityId: string;
  locationId?: string | null;
  meta?: Record<string, unknown>;
};

/**
 * Append an immutable activity log row. Pass the transaction client (`tx`)
 * so the log and the mutation commit together.
 */
export async function logActivity(
  tx: Prisma.TransactionClient | PrismaClient,
  input: ActivityInput,
) {
  return tx.activityLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      locationId: input.locationId ?? null,
      meta: (input.meta ?? {}) as Prisma.InputJsonValue,
    },
  });
}
