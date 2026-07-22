import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { localDateISO } from "./time";

// Reads the synced external ops logbook (OpsLogPost) and rolls it up the way the
// external AI-operations dashboard does — now with REAL sentiment + numeric risk.

export type OpsFilters = { from?: string; to?: string; locationExtId?: string; category?: string };

export type OpsLocationRow = { name: string; records: number; avgRisk: number; followUps: number; highSeverity: number };
export type OpsListItem = {
  id: string; message: string; summary: string | null; category: string; locationName: string;
  writerName: string; severity: string | null; sentiment: string | null; riskScore: number | null;
  recommendedAction: string | null; date: string; postedAt: string;
};

const isValidDay = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const mean = (nums: number[]) => (nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0);
const HIGH = new Set(["High", "Critical", "Severe"]);
const SEV_RANK: Record<string, number> = { Critical: 4, Severe: 4, High: 3, Medium: 2, Low: 1 };

function mode(values: string[]): { name: string; count: number } | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: { name: string; count: number } | null = null;
  for (const [name, count] of counts) if (!best || count > best.count) best = { name, count };
  return best;
}

export async function getOpsOverview(filters: OpsFilters) {
  const to = isValidDay(filters.to) ? filters.to! : localDateISO();
  const from = isValidDay(filters.from) ? filters.from! : localDateISO(new Date(Date.now() - 29 * 86400000));

  const where: Prisma.OpsLogPostWhereInput = {
    date: { gte: from, lte: to },
    ...(filters.locationExtId ? { locationExtId: filters.locationExtId } : {}),
    ...(filters.category ? { category: filters.category } : {}),
  };

  const [rows, lastSyncedAgg, categoryGroups, locationGroups] = await Promise.all([
    prisma.opsLogPost.findMany({ where, orderBy: { postedAt: "desc" } }),
    prisma.opsLogPost.aggregate({ _max: { syncedAt: true } }),
    prisma.opsLogPost.groupBy({ by: ["category"], orderBy: { category: "asc" } }),
    prisma.opsLogPost.groupBy({ by: ["locationExtId", "locationName"], orderBy: { locationName: "asc" } }),
  ]);

  const analyzed = rows.filter((r) => r.aiAnalyzed);
  const riskVals = analyzed.map((r) => r.aiRiskScore).filter((v): v is number => v != null);
  const sentVals = analyzed.map((r) => r.aiSentimentScore).filter((v): v is number => v != null);

  const locMap = new Map<string, { name: string; records: number; risks: number[]; followUps: number; high: number }>();
  for (const r of rows) {
    const row = locMap.get(r.locationName) ?? { name: r.locationName, records: 0, risks: [], followUps: 0, high: 0 };
    row.records += 1;
    if (r.aiRiskScore != null) row.risks.push(r.aiRiskScore);
    if (r.aiFollowUpRequired) row.followUps += 1;
    if (r.aiSeverity && HIGH.has(r.aiSeverity)) row.high += 1;
    locMap.set(r.locationName, row);
  }
  const perLocation: OpsLocationRow[] = [...locMap.values()]
    .map((l) => ({ name: l.name, records: l.records, avgRisk: mean(l.risks), followUps: l.followUps, highSeverity: l.high }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const toItem = (r: (typeof rows)[number]): OpsListItem => ({
    id: r.id,
    message: r.message,
    summary: r.aiSummary,
    category: r.category,
    locationName: r.locationName,
    writerName: r.writerName,
    severity: r.aiSeverity,
    sentiment: r.aiSentiment,
    riskScore: r.aiRiskScore,
    recommendedAction: r.aiRecommendedAction,
    date: r.date,
    postedAt: r.postedAt.toISOString(),
  });

  // Open follow-ups only (a manager can resolve items out of the queue), ordered
  // by severity then risk so the most urgent surface first.
  const open = rows.filter((r) => r.aiFollowUpRequired && r.resolvedAt == null);
  const attention = [...open]
    .sort((a, b) => (SEV_RANK[b.aiSeverity ?? ""] ?? 0) - (SEV_RANK[a.aiSeverity ?? ""] ?? 0) || (b.aiRiskScore ?? 0) - (a.aiRiskScore ?? 0))
    .slice(0, 15)
    .map(toItem);

  const attentionStats = {
    total: open.length,
    high: open.filter((r) => r.aiSeverity && HIGH.has(r.aiSeverity)).length,
    medium: open.filter((r) => r.aiSeverity === "Medium").length,
    low: open.filter((r) => r.aiSeverity === "Low").length,
    resolved: rows.filter((r) => r.aiFollowUpRequired && r.resolvedAt != null).length,
    topLocation: mode(open.map((r) => r.locationName)),
    topCategory: mode(open.map((r) => r.aiCategory ?? r.category)),
  };

  return {
    period: { from, to },
    lastSyncedAt: lastSyncedAgg._max.syncedAt ? lastSyncedAgg._max.syncedAt.toISOString() : null,
    kpi: {
      records: rows.length,
      analyzed: analyzed.length,
      avgRisk: mean(riskVals),
      avgSentiment: mean(sentVals), // -100..100
      followUps: open.length,
      highSeverity: rows.filter((r) => r.aiSeverity && HIGH.has(r.aiSeverity)).length,
    },
    perLocation,
    attention,
    attentionStats,
    recent: rows.slice(0, 12).map(toItem),
    categories: categoryGroups.map((c) => c.category),
    locations: locationGroups.map((l) => ({ id: l.locationExtId, name: l.locationName })),
  };
}
