import { NextResponse } from "next/server";

/**
 * Guards outbound integration endpoints (e.g. the logbook sync the external
 * AI-operations dashboard pulls from). The caller must present the shared token
 * as `Authorization: Bearer <LOGBOOK_SYNC_TOKEN>` or `?key=<token>`.
 *
 * Returns a 401 NextResponse if unauthorized, or null if the request may proceed.
 * Unlike the cron guard, this NEVER auto-allows when unset — an integration that
 * exposes real data must not be world-readable by accident. If the token is not
 * configured, every request is rejected.
 */
export function checkIntegrationAuth(req: Request): NextResponse | null {
  const secret = process.env.LOGBOOK_SYNC_TOKEN;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Integration disabled (no token configured)" }, { status: 503 });
  }

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return null;

  const key = new URL(req.url).searchParams.get("key");
  if (key === secret) return null;

  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}
