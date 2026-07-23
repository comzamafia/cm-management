"use server";

import { revalidatePath } from "next/cache";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "./prisma";
import { getCurrentUser, atLeast } from "./auth";
import { runOpsSync, type SyncResult } from "./ops-sync-core";

// Manager-facing "Sync" action — auth check, then the shared core (which the
// daily cron also calls directly, without a user session).
export async function syncOpsData(input?: { start?: string; end?: string }): Promise<SyncResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!atLeast(user.role, Role.STORE_MANAGER)) return { ok: false, error: "Manager access required" };
  return runOpsSync(input);
}

const OPS_PER_PAGE = 30;

export type OpsPostRow = {
  id: string; message: string; category: string; locationName: string; writerName: string;
  postedAt: string; severity: string | null; riskScore: number | null; sentiment: string | null; followUp: boolean;
};

// Paginated, filterable feed of the synced ops posts — powers the "Synced" tab
// on /logbook. Manager-gated (that page's analytics view is STORE_MANAGER+).
export async function getOpsPosts(filters: {
  locationExtId?: string; category?: string; from?: string; to?: string; page?: number;
}): Promise<{ total: number; page: number; totalPages: number; posts: OpsPostRow[]; categories: string[]; locations: { id: string; name: string }[] }> {
  const empty = { total: 0, page: 1, totalPages: 1, posts: [], categories: [], locations: [] };
  const user = await getCurrentUser();
  if (!user || !atLeast(user.role, Role.STORE_MANAGER)) return empty;

  const page = Math.max(1, filters.page ?? 1);
  const valid = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);
  const from = valid(filters.from);
  const to = valid(filters.to);

  const where: Prisma.OpsLogPostWhereInput = {
    ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(filters.locationExtId ? { locationExtId: filters.locationExtId } : {}),
    ...(filters.category ? { category: filters.category } : {}),
  };

  const [total, rows, cats, locs] = await Promise.all([
    prisma.opsLogPost.count({ where }),
    prisma.opsLogPost.findMany({ where, orderBy: { postedAt: "desc" }, skip: (page - 1) * OPS_PER_PAGE, take: OPS_PER_PAGE }),
    prisma.opsLogPost.groupBy({ by: ["category"], orderBy: { category: "asc" } }),
    prisma.opsLogPost.groupBy({ by: ["locationExtId", "locationName"], orderBy: { locationName: "asc" } }),
  ]);

  return {
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / OPS_PER_PAGE)),
    posts: rows.map((r) => ({
      id: r.id, message: r.message, category: r.category, locationName: r.locationName,
      writerName: r.writerName, postedAt: r.postedAt.toISOString(),
      severity: r.aiSeverity, riskScore: r.aiRiskScore, sentiment: r.aiSentiment, followUp: r.aiFollowUpRequired && r.resolvedAt == null,
    })),
    categories: cats.map((c) => c.category),
    locations: locs.map((l) => ({ id: l.locationExtId, name: l.locationName })),
  };
}

export type SyncedDayPost = {
  id: string; message: string; category: string; writerName: string; postedAt: string;
  severity: string | null; riskScore: number | null; sentiment: string | null; followUp: boolean;
};
export type SyncedDayLocation = { name: string; posts: SyncedDayPost[] };

// Synced ops posts for a single day, grouped by location — merged into the
// logbook's Daily Rollup so it sits next to the internal per-location rollup.
export async function getSyncedDay(day: string): Promise<SyncedDayLocation[]> {
  const user = await getCurrentUser();
  if (!user || !atLeast(user.role, Role.STORE_MANAGER)) return [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return [];

  const rows = await prisma.opsLogPost.findMany({ where: { date: day }, orderBy: { postedAt: "asc" } });
  const map = new Map<string, SyncedDayLocation>();
  for (const r of rows) {
    const g = map.get(r.locationName) ?? { name: r.locationName, posts: [] };
    g.posts.push({
      id: r.id, message: r.message, category: r.category, writerName: r.writerName, postedAt: r.postedAt.toISOString(),
      severity: r.aiSeverity, riskScore: r.aiRiskScore, sentiment: r.aiSentiment, followUp: r.aiFollowUpRequired && r.resolvedAt == null,
    });
    map.set(r.locationName, g);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Clear (or re-open) a follow-up item from the attention queue. Stored locally on
// the row, so it persists across re-syncs.
export async function resolveOpsItem(id: string, resolved: boolean): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!atLeast(user.role, Role.STORE_MANAGER)) return { ok: false, error: "Manager access required" };
  await prisma.opsLogPost.update({
    where: { id },
    data: resolved ? { resolvedAt: new Date(), resolvedById: user.id } : { resolvedAt: null, resolvedById: null },
  });
  revalidatePath("/performance-overview");
  return { ok: true };
}
