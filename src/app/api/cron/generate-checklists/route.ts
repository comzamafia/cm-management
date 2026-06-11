import { NextResponse } from "next/server";
import { generateDueChecklists } from "@/lib/checklists";
import { checkCronAuth } from "@/lib/cron-auth";

// GET /api/cron/generate-checklists
// Generates today's due checklist tasks. Bypasses the per-template hour gate by
// default (force=true) so a once-daily scheduler still generates everything;
// frequency (weekDay/monthDay) and once-per-day idempotency are still enforced.
// Pass ?force=0 to respect the hour gate (e.g. when running hourly on Pro).
export async function GET(req: Request) {
  const unauthorized = checkCronAuth(req);
  if (unauthorized) return unauthorized;

  const force = new URL(req.url).searchParams.get("force") !== "0";
  const result = await generateDueChecklists(new Date(), force);
  return NextResponse.json({ ok: true, ...result });
}
