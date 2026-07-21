import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkIntegrationAuth } from "@/lib/integration-auth";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/integrations/logbook
// Read-only logbook feed for the external AI-operations dashboard's "Sync
// logbook" pull. Auth: Authorization: Bearer <LOGBOOK_SYNC_TOKEN> (or ?key=).
//
// Query params (all optional):
//   from      ISO datetime — include entries created at/after this instant
//   to        ISO datetime — include entries created strictly before this instant
//   since     ISO datetime — alias for `from`, for incremental "give me what's new" syncs
//   locationId  restrict to one location
//   limit     page size, default 200, max 1000
//   cursor    id of the last record from the previous page (keyset pagination)
//
// Response: { ok, count, nextCursor, records: [...] } ordered by (createdAt, id) asc,
// so a client can page forward and remember the max createdAt for the next sync.
const MAX_LIMIT = 1000;
const DEFAULT_LIMIT = 200;

function parseDate(v: string | null): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET(req: Request) {
  const unauthorized = checkIntegrationAuth(req);
  if (unauthorized) return unauthorized;

  const sp = new URL(req.url).searchParams;
  const from = parseDate(sp.get("from")) ?? parseDate(sp.get("since"));
  const to = parseDate(sp.get("to"));
  const locationId = sp.get("locationId") || undefined;
  const cursor = sp.get("cursor") || undefined;
  const limit = Math.min(Math.max(parseInt(sp.get("limit") || "", 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  const createdAt: Prisma.DateTimeFilter = {};
  if (from) createdAt.gte = from;
  if (to) createdAt.lt = to;

  const where: Prisma.LogEntryWhereInput = {
    ...(from || to ? { createdAt } : {}),
    ...(locationId ? { locationId } : {}),
  };

  const rows = await prisma.logEntry.findMany({
    where,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit + 1, // one extra to detect a next page
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      location: { select: { id: true, name: true } },
      author: { select: { id: true, name: true } },
    },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const records = page.map((e) => ({
    id: e.id,
    createdAt: e.createdAt.toISOString(),
    location: { id: e.location.id, name: e.location.name },
    author: { id: e.author.id, name: e.author.name },
    category: e.category,       // OPERATIONS | SALES_METRICS | CUSTOMER_COMPLAINT | ACTION_NEEDED
    department: e.department,   // FOH | BOH
    body: e.body,               // the note text the AI analyses
    itemTag: e.itemTag,
    photoUrls: (e.photoUrls as unknown as string[]) ?? [],
    ai: {
      riskLevel: e.aiRiskLevel, // LOW | MEDIUM | HIGH | null
      summary: e.aiSummary,
      analyzedAt: e.aiAnalyzedAt ? e.aiAnalyzedAt.toISOString() : null,
    },
    resolved: e.resolvedAt != null,
    resolvedAt: e.resolvedAt ? e.resolvedAt.toISOString() : null,
  }));

  return NextResponse.json({
    ok: true,
    count: records.length,
    nextCursor: hasMore ? page[page.length - 1].id : null,
    records,
  });
}
