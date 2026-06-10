import { NextResponse } from "next/server";
import { generateDueChecklists } from "@/lib/checklists";

// GET /api/cron/generate-checklists?force=1
// Trigger: call with a scheduler (e.g. every hour) or force=1 for manual runs.
export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get("force") === "1";
  const result = await generateDueChecklists(new Date(), force);
  return NextResponse.json({ ok: true, ...result });
}
