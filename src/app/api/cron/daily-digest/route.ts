import { NextResponse } from "next/server";
import { sendDailyDigest } from "@/lib/digest";
import { checkCronAuth } from "@/lib/cron-auth";

// GET /api/cron/daily-digest
// Sends a daily summary notification to OWNER and AREA_MANAGER users (idempotent).
export async function GET(req: Request) {
  const unauthorized = checkCronAuth(req);
  if (unauthorized) return unauthorized;

  const result = await sendDailyDigest();
  return NextResponse.json({ ok: true, ...result });
}
