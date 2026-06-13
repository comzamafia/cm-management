import { NextResponse } from "next/server";
import { generateDueChecklists } from "@/lib/checklists";
import { runOverdueChecks } from "@/lib/overdue";
import { runMaintenanceSla } from "@/lib/maintenance-sla";
import { runComplianceReminders } from "@/lib/compliance";
import { sendDailyDigest } from "@/lib/digest";
import { checkCronAuth } from "@/lib/cron-auth";

// GET /api/cron/run-all
// Single entry point for the daily scheduler — runs every background job in order.
// Registered as the one cron in vercel.json so it works on any Vercel plan
// (Hobby allows only a couple of once-daily crons). The individual routes remain
// available for manual/on-demand triggering and debugging.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const unauthorized = checkCronAuth(req);
  if (unauthorized) return unauthorized;

  const now = new Date();

  // 1. Generate today's recurring checklist tasks (hour gate bypassed for daily run).
  const generated = await generateDueChecklists(now, true);

  // 2. Mark overdue, escalate, and send near-due reminders.
  const overdue = await runOverdueChecks(now);

  // 3. Escalate maintenance requests that breached their priority SLA.
  const maintenance = await runMaintenanceSla(now);

  // 4. Send multi-step advance + overdue reminders for compliance schedules.
  const compliance = await runComplianceReminders(now);

  // 5. Send the daily digest to owners / area managers.
  const digest = await sendDailyDigest();

  return NextResponse.json({
    ok: true,
    ranAt: now.toISOString(),
    generated,
    overdue,
    maintenance,
    compliance,
    digest: { sent: digest.sent, skipped: digest.skipped },
  });
}
