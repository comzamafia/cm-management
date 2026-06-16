import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { locationScopeWhere } from "./auth";
import { startOfDayTZ } from "./time";

type ScopeUser = { role: Role; locationId: string | null };

/** Normalize any date input to UTC midnight (the business-day key). */
function dayKey(input: string | Date): Date {
  const d = new Date(input);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Aggregated server-performance leaderboard for a date range, scoped to the user. */
export async function getServerPerformance(
  user: ScopeUser,
  opts: { from?: Date; to?: Date } = {},
) {
  const scope = await locationScopeWhere(user);
  const to = opts.to ?? new Date();
  const from = opts.from ?? new Date(startOfDayTZ(to).getTime() - 6 * 86400000); // last 7 days

  const rows = await prisma.serverPerformance.findMany({
    where: { ...scope, date: { gte: from, lte: to } },
    include: { server: { select: { id: true, name: true } }, location: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  type Agg = {
    serverId: string; name: string; locationName: string;
    sales: number; covers: number; tips: number; upsells: number;
    reviewSum: number; reviewN: number; days: number;
  };
  const map = new Map<string, Agg>();
  for (const r of rows) {
    const a = map.get(r.serverId) ?? {
      serverId: r.serverId, name: r.server.name, locationName: r.location.name,
      sales: 0, covers: 0, tips: 0, upsells: 0, reviewSum: 0, reviewN: 0, days: 0,
    };
    a.sales += r.sales; a.covers += r.covers; a.tips += r.tips; a.upsells += r.upsells; a.days += 1;
    if (r.reviewScore != null) { a.reviewSum += r.reviewScore; a.reviewN += 1; }
    map.set(r.serverId, a);
  }

  const servers = [...map.values()]
    .map((a) => ({
      serverId: a.serverId,
      name: a.name,
      locationName: a.locationName,
      sales: a.sales,
      covers: a.covers,
      tips: a.tips,
      upsells: a.upsells,
      days: a.days,
      avgCheck: a.covers > 0 ? a.sales / a.covers : 0,
      tipPct: a.sales > 0 ? (a.tips / a.sales) * 100 : 0,
      reviewAvg: a.reviewN > 0 ? a.reviewSum / a.reviewN : null,
    }))
    .sort((x, y) => y.sales - x.sales);

  const totals = {
    sales: servers.reduce((s, x) => s + x.sales, 0),
    covers: servers.reduce((s, x) => s + x.covers, 0),
    tips: servers.reduce((s, x) => s + x.tips, 0),
    servers: servers.length,
  };

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    servers,
    totals: { ...totals, avgCheck: totals.covers > 0 ? totals.sales / totals.covers : 0 },
  };
}

export type PerfRecord = {
  serverId?: string;
  serverEmail?: string;
  locationId?: string;
  locationName?: string;
  date: string; // ISO date
  sales?: number;
  covers?: number;
  tips?: number;
  upsells?: number;
  reviewScore?: number | null;
};

/** Upsert performance records pushed from the external API. Returns per-row results. */
export async function ingestPerformance(records: PerfRecord[]) {
  const results: { ok: boolean; error?: string }[] = [];
  let upserted = 0;

  // Cache lookups.
  const usersByEmail = new Map<string, string>();
  const locsByName = new Map<string, string>();

  for (const rec of records) {
    try {
      // Resolve server.
      let serverId = rec.serverId;
      if (!serverId && rec.serverEmail) {
        const email = rec.serverEmail.toLowerCase();
        serverId = usersByEmail.get(email);
        if (!serverId) {
          const u = await prisma.user.findUnique({ where: { email: rec.serverEmail }, select: { id: true } });
          if (u) { serverId = u.id; usersByEmail.set(email, u.id); }
        }
      }
      if (!serverId) { results.push({ ok: false, error: "Unknown server (provide serverId or serverEmail)" }); continue; }

      // Resolve location.
      let locationId = rec.locationId;
      if (!locationId && rec.locationName) {
        const key = rec.locationName.toLowerCase();
        locationId = locsByName.get(key);
        if (!locationId) {
          const l = await prisma.location.findFirst({ where: { name: { equals: rec.locationName, mode: "insensitive" } }, select: { id: true } });
          if (l) { locationId = l.id; locsByName.set(key, l.id); }
        }
      }
      if (!locationId) { results.push({ ok: false, error: "Unknown location" }); continue; }

      if (!rec.date) { results.push({ ok: false, error: "Missing date" }); continue; }
      const date = dayKey(rec.date);

      const data = {
        sales: rec.sales ?? 0,
        covers: rec.covers ?? 0,
        tips: rec.tips ?? 0,
        upsells: rec.upsells ?? 0,
        reviewScore: rec.reviewScore ?? null,
        source: "api",
      };

      await prisma.serverPerformance.upsert({
        where: { serverId_locationId_date: { serverId, locationId, date } },
        create: { serverId, locationId, date, ...data },
        update: data,
      });
      upserted += 1;
      results.push({ ok: true });
    } catch (e) {
      results.push({ ok: false, error: (e as Error).message });
    }
  }

  return { upserted, total: records.length, results };
}
