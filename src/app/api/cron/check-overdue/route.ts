import { NextResponse } from "next/server";
import { runOverdueChecks } from "@/lib/overdue";
import { checkCronAuth } from "@/lib/cron-auth";

// GET /api/cron/check-overdue
// Marks past-due tasks OVERDUE, escalates to managers, sends near-due reminders.
export async function GET(req: Request) {
  const unauthorized = checkCronAuth(req);
  if (unauthorized) return unauthorized;

  const result = await runOverdueChecks(new Date());
  return NextResponse.json({ ok: true, ...result });
}
