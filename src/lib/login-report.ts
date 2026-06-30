import { prisma } from "./prisma";
import { createNotification } from "./notifications";
import { startOfDayTZ, APP_TZ } from "./time";
import { ROLE_LABEL } from "./labels";

// Sujee receives the daily login-activity report
const REPORT_RECIPIENT_ID = "cmq92qov50001jo04684n5q3c";

export async function runLoginReport(now: Date = new Date()): Promise<{ sent: boolean; noLoginCount: number }> {
  const todayStart = startOfDayTZ(now, APP_TZ);

  // Idempotent: skip if already sent today
  const alreadySent = await prisma.notification.findFirst({
    where: {
      userId: REPORT_RECIPIENT_ID,
      entityType: "login_report",
      createdAt: { gte: todayStart },
    },
  });
  if (alreadySent) return { sent: false, noLoginCount: 0 };

  // Active users who haven't logged in at all or not yet today
  const inactive = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { lastLoginAt: null },
        { lastLoginAt: { lt: todayStart } },
      ],
    },
    select: { id: true, name: true, role: true, location: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  if (inactive.length === 0) return { sent: false, noLoginCount: 0 };

  const lines = inactive.map(
    (u) => `• ${u.name} — ${ROLE_LABEL[u.role]}${u.location ? ` (${u.location.name})` : ""}`,
  );

  await createNotification(prisma, {
    userId: REPORT_RECIPIENT_ID,
    type: "DAILY_DIGEST",
    title: `${inactive.length} user${inactive.length !== 1 ? "s" : ""} haven't logged in today`,
    body: lines.join("\n"),
    entityType: "login_report",
  });

  return { sent: true, noLoginCount: inactive.length };
}
