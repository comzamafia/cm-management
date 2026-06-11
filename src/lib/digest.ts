import { prisma } from "./prisma";
import { createNotification } from "./notifications";
import { buildDigestSummary } from "./reports";

/**
 * Sends a daily summary notification to all OWNER and AREA_MANAGER users.
 * Idempotent: skips users who already received a DAILY_DIGEST today (UTC).
 */
export async function sendDailyDigest(): Promise<{
  sent: number;
  skipped: number;
  summary: Awaited<ReturnType<typeof buildDigestSummary>>;
}> {
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

  return { sent, skipped, summary };
}
