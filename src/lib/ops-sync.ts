"use server";

import { revalidatePath } from "next/cache";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "./prisma";
import { getCurrentUser, atLeast } from "./auth";
import { localDateISO } from "./time";

const OPS_API_URL = (process.env.OPS_API_URL || "https://chiangmai-ai-operations.vercel.app").replace(/\/$/, "");

// The external /api/dashboard is currently public; if it later requires a token,
// set OPS_API_KEY and it is sent as a Bearer header.
function opsHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = {};
  if (json) h["content-type"] = "application/json";
  if (process.env.OPS_API_KEY) h["authorization"] = `Bearer ${process.env.OPS_API_KEY}`;
  return h;
}

type ExtLocation = { id: number; name: string };
type ExtAi = {
  summary?: string; keywords?: string[]; severity?: string; sentiment?: string;
  sentiment_score?: number; risk_score?: number; department?: string; ai_category?: string;
  root_cause?: string; recommended_action?: string; follow_up_required?: boolean;
} | null;
type ExtPost = {
  id: number; location_id: number; date: string; created: string;
  writer_user_id: number | null; writer_name: string; writer_role: string;
  message: string; category: string; attachments: unknown[]; ai: ExtAi;
};

export type SyncResult = { ok: boolean; error?: string; fetched?: number; created?: number; updated?: number; purged?: number; from?: string; to?: string };

export async function syncOpsData(input?: { start?: string; end?: string }): Promise<SyncResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!atLeast(user.role, Role.STORE_MANAGER)) return { ok: false, error: "Manager access required" };

  const to = input?.end ?? localDateISO();
  const from = input?.start ?? localDateISO(new Date(Date.now() - 29 * 86400000));

  // 1. Best-effort: ask the external app to refresh its logbook from 7shifts for
  //    the window. If this fails we still pull whatever it already has.
  try {
    await fetch(`${OPS_API_URL}/api/sync/logbook-posts`, {
      method: "POST",
      headers: opsHeaders(true),
      body: JSON.stringify({ start: from, end: to, locationId: "All" }),
    });
  } catch { /* ignore — proceed to pull */ }

  // 2. Pull the analysed posts.
  let payload: { locations: ExtLocation[]; posts: ExtPost[] };
  try {
    const res = await fetch(
      `${OPS_API_URL}/api/dashboard?start=${from}&end=${to}&category=All&locationId=All`,
      { headers: opsHeaders(), cache: "no-store" },
    );
    if (!res.ok) return { ok: false, error: `Ops API returned ${res.status}` };
    payload = await res.json();
  } catch (e) {
    return { ok: false, error: `Could not reach the ops API: ${(e as Error).message}` };
  }

  const posts = Array.isArray(payload.posts) ? payload.posts : [];
  const nameById = new Map<number, string>((payload.locations ?? []).map((l) => [l.id, l.name]));
  const jsonOrNull = (v: unknown) => (v == null ? Prisma.DbNull : (v as Prisma.InputJsonValue));

  const rows = posts.map((p) => ({
    externalId: String(p.id),
    locationExtId: String(p.location_id),
    locationName: nameById.get(p.location_id) ?? String(p.location_id),
    date: p.date,
    postedAt: new Date(p.created),
    writerUserId: p.writer_user_id != null ? String(p.writer_user_id) : null,
    writerName: p.writer_name || "Unknown",
    writerRole: p.writer_role || null,
    message: p.message || "",
    category: p.category || "Uncategorized",
    attachments: (p.attachments ?? []) as Prisma.InputJsonValue,
    aiAnalyzed: !!p.ai,
    aiSummary: p.ai?.summary ?? null,
    aiKeywords: jsonOrNull(p.ai?.keywords),
    aiSeverity: p.ai?.severity ?? null,
    aiSentiment: p.ai?.sentiment ?? null,
    aiSentimentScore: p.ai?.sentiment_score ?? null,
    aiRiskScore: p.ai?.risk_score ?? null,
    aiDepartment: p.ai?.department ?? null,
    aiCategory: p.ai?.ai_category ?? null,
    aiRootCause: p.ai?.root_cause ?? null,
    aiRecommendedAction: p.ai?.recommended_action ?? null,
    aiFollowUpRequired: p.ai?.follow_up_required ?? false,
    aiRaw: jsonOrNull(p.ai),
  }));

  // 3. Insert new posts in chunks. The unique externalId + skipDuplicates is what
  //    guarantees no duplicates on overlapping re-syncs (fast, no per-row round-trips).
  let created = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const res = await prisma.opsLogPost.createMany({ data: rows.slice(i, i + 500), skipDuplicates: true });
    created += res.count;
  }

  // 4. Refresh AI on posts that were stored BEFORE the external app had analysed
  //    them (ai went null -> populated). Bounded to that subset, so it stays cheap.
  const analyzedRows = rows.filter((r) => r.aiAnalyzed);
  let updated = 0;
  if (analyzedRows.length) {
    const stale = await prisma.opsLogPost.findMany({
      where: { externalId: { in: analyzedRows.map((r) => r.externalId) }, aiAnalyzed: false },
      select: { externalId: true },
    });
    const staleSet = new Set(stale.map((s) => s.externalId));
    for (const r of analyzedRows) {
      if (!staleSet.has(r.externalId)) continue;
      await prisma.opsLogPost.update({ where: { externalId: r.externalId }, data: r });
      updated += 1;
    }
  }

  // 5. Retention: drop anything older than the 30-day window we keep, so the
  //    table never grows unbounded (and stale posts leave the feed/queue).
  const purgedRes = await prisma.opsLogPost.deleteMany({ where: { date: { lt: from } } });

  revalidatePath("/performance-overview");
  revalidatePath("/logbook");
  return { ok: true, fetched: rows.length, created, updated, purged: purgedRes.count, from, to };
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
