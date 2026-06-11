import { NextResponse } from "next/server";

/**
 * Guards a cron route. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`
 * automatically when CRON_SECRET is set in the project env. We also allow the
 * same secret via `?key=` for manual/curl runs.
 *
 * Returns a 401 NextResponse if unauthorized, or null if the request may proceed.
 * If CRON_SECRET is not configured at all, the guard is skipped (dev convenience).
 */
export function checkCronAuth(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null; // not configured — allow (local dev)

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return null;

  const key = new URL(req.url).searchParams.get("key");
  if (key === secret) return null;

  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}
