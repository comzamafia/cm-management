import { NextResponse } from "next/server";
import { runComplianceReminders } from "@/lib/compliance";
import { checkCronAuth } from "@/lib/cron-auth";

// GET /api/cron/compliance
// Sends multi-step advance reminders (14/7/3/1 days) and throttled overdue alerts
// for active compliance schedules. Also wired into /api/cron/run-all for the daily run.
export async function GET(req: Request) {
  const unauthorized = checkCronAuth(req);
  if (unauthorized) return unauthorized;

  const result = await runComplianceReminders(new Date());
  return NextResponse.json({ ok: true, ...result });
}
