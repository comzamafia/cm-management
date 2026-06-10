import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { buildDigestSummary } from "@/lib/reports";

// GET /api/cron/daily-digest
// Call once per day (e.g. 08:00 UTC). Sends a rich summary notification to all
// OWNER and AREA_MANAGER users. Idempotent: skips users who already got one today.

export async function GET() {
  const summary = await buildDigestSummary();

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const recipients = await prisma.user.findMany({
    where: { role: { in: ["OWNER", "AREA_MANAGER"] }, status: "ACTIVE" },
    select: { id: true },
  });

  let sent = 0;
  let skipped = 0;

  for (const u of recipients) {
    const alreadySent = await prisma.notification.findFirst({
      where: { userId: u.id, type: "DAILY_DIGEST", createdAt: { gte: todayStart } },
    });
    if (alreadySent) { skipped++; continue; }

    await createNotification(prisma, {
      userId: u.id,
      type: "DAILY_DIGEST",
      title: summary.title,
      body: summary.body,
      entityType: "Dashboard",
    });
    sent++;
  }

  return NextResponse.json({ ok: true, sent, skipped, summary });
}
