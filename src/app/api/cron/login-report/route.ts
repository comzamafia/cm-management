import { NextResponse } from "next/server";
import { runLoginReport } from "@/lib/login-report";
import { checkCronAuth } from "@/lib/cron-auth";

// GET /api/cron/login-report
// Sends Sujee a daily notification listing users who haven't logged in today.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const unauthorized = checkCronAuth(req);
  if (unauthorized) return unauthorized;

  const result = await runLoginReport();
  return NextResponse.json({ ok: true, ...result });
}
