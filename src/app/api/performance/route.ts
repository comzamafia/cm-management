import { NextResponse } from "next/server";
import { ingestPerformance, type PerfRecord } from "@/lib/performance";
import { prisma } from "@/lib/prisma";
import { checkApiKey } from "@/lib/api-auth";

// POST /api/performance   (Authorization: Bearer <PERF_API_KEY>)
// Body: { records: [{ serverEmail|serverId, locationName|locationId, date,
//                      sales, covers, tips, upsells, reviewScore }] }
// Upserts one row per (server, location, business day). The company website/POS
// calls this to push daily server-performance data.
export async function POST(req: Request) {
  const unauthorized = checkApiKey(req);
  if (unauthorized) return unauthorized;

  let body: { records?: PerfRecord[] } | PerfRecord[];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const records = Array.isArray(body) ? body : body.records;
  if (!Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ ok: false, error: "Expected { records: [...] }" }, { status: 400 });
  }

  const result = await ingestPerformance(records);
  return NextResponse.json({ ok: true, ...result });
}

// GET /api/performance?from=ISO&to=ISO   (Authorization: Bearer <PERF_API_KEY>)
// Returns raw rows for the website to read back.
export async function GET(req: Request) {
  const unauthorized = checkApiKey(req);
  if (unauthorized) return unauthorized;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const rows = await prisma.serverPerformance.findMany({
    where: {
      ...(from || to
        ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {}),
    },
    include: { server: { select: { name: true, email: true } }, location: { select: { name: true } } },
    orderBy: { date: "desc" },
    take: 1000,
  });

  return NextResponse.json({
    ok: true,
    rows: rows.map((r) => ({
      server: r.server.name, email: r.server.email, location: r.location.name,
      date: r.date.toISOString().slice(0, 10),
      sales: r.sales, covers: r.covers, tips: r.tips, upsells: r.upsells, reviewScore: r.reviewScore,
    })),
  });
}
