import { NextResponse } from "next/server";

/**
 * Guards the public data-ingest API (e.g. /api/performance). The caller must send
 * `Authorization: Bearer <PERF_API_KEY>` (or ?key=). Unlike the cron guard, this
 * REJECTS when no key is configured — an open write endpoint is never desirable.
 */
export function checkApiKey(req: Request): NextResponse | null {
  const secret = process.env.PERF_API_KEY;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "API key not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  const key = new URL(req.url).searchParams.get("key");
  if (auth === `Bearer ${secret}` || key === secret) return null;
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}
