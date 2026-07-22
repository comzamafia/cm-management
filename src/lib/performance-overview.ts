import { LogCategory, RiskLevel } from "@prisma/client";
import { prisma } from "./prisma";
import { getCurrentUser, locationScopeWhere } from "./auth";
import { localDateISO } from "./time";

// Native "Performance overview" — the same shape the external AI-operations
// dashboard shows, but computed from our own logbook (LogEntry + its AI risk
// analysis). We do NOT compute sentiment (our AI only scores risk), so the
// sentiment card is replaced by a High-risk count.

// Our AI risk is categorical; map it to a 0-100 score so we can show an average
// the way the external "Average risk / 100" card does. Mid-band representatives.
const RISK_SCORE: Record<RiskLevel, number> = { LOW: 30, MEDIUM: 60, HIGH: 90 };

export type PerfFilters = { from?: string; to?: string; locationId?: string; category?: LogCategory };

export type PerfLocationRow = { id: string; name: string; records: number; avgRisk: number; highRisk: number; followUps: number };
export type PerfListItem = {
  id: string; body: string; category: LogCategory; locationName: string; authorName: string;
  riskLevel: RiskLevel | null; createdAt: string;
};

const isValidDay = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export async function getPerformanceOverview(filters: PerfFilters) {
  const user = await getCurrentUser();
  if (!user) return null;
  const scope = await locationScopeWhere(user);

  // Default window: the last 30 days.
  const toISO = isValidDay(filters.to) ? filters.to! : localDateISO();
  const fromISO = isValidDay(filters.from) ? filters.from! : localDateISO(new Date(Date.now() - 29 * 86400000));
  const gte = new Date(`${fromISO}T00:00:00.000Z`);
  const lt = new Date(new Date(`${toISO}T00:00:00.000Z`).getTime() + 86400000);

  const where = {
    createdAt: { gte, lt },
    ...scope,
    ...(filters.locationId ? { locationId: filters.locationId } : {}),
    ...(filters.category ? { category: filters.category } : {}),
  };

  const [entries, locations] = await Promise.all([
    prisma.logEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true } }, location: { select: { id: true, name: true } } },
    }),
    // All in-scope locations (optionally narrowed to the filtered one) so the
    // table lists every branch even with zero records, like the external.
    prisma.location.findMany({
      where: {
        ...(scope.locationId ? { id: { in: scope.locationId.in } } : {}),
        ...(filters.locationId ? { id: filters.locationId } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const analyzed = entries.filter((e) => e.aiRiskLevel != null);
  const avg = (rows: typeof analyzed) =>
    rows.length === 0 ? 0 : Math.round(rows.reduce((s, e) => s + RISK_SCORE[e.aiRiskLevel!], 0) / rows.length);

  const perLocation: PerfLocationRow[] = locations.map((loc) => {
    const locEntries = entries.filter((e) => e.locationId === loc.id);
    return {
      id: loc.id,
      name: loc.name,
      records: locEntries.length,
      avgRisk: avg(locEntries.filter((e) => e.aiRiskLevel != null)),
      highRisk: locEntries.filter((e) => e.aiRiskLevel === "HIGH").length,
      followUps: locEntries.filter((e) => e.aiRiskLevel === "HIGH" && e.resolvedAt == null).length,
    };
  });

  const toItem = (e: (typeof entries)[number]): PerfListItem => ({
    id: e.id,
    body: e.body,
    category: e.category,
    locationName: e.location.name,
    authorName: e.author.name,
    riskLevel: e.aiRiskLevel,
    createdAt: e.createdAt.toISOString(),
  });

  return {
    period: { from: fromISO, to: toISO },
    kpi: {
      records: entries.length,
      analyzed: analyzed.length,
      avgRisk: avg(analyzed),
      highRisk: entries.filter((e) => e.aiRiskLevel === "HIGH").length,
      followUps: entries.filter((e) => e.aiRiskLevel === "HIGH" && e.resolvedAt == null).length,
    },
    perLocation,
    attention: entries.filter((e) => e.aiRiskLevel === "HIGH" && e.resolvedAt == null).slice(0, 12).map(toItem),
    recent: entries.slice(0, 12).map(toItem),
  };
}
