import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { isManager } from "./rules";
import { scopedLocationIds } from "./auth";
import { localDateISO, APP_TZ } from "./time";

export type LoginEvent = {
  id: string;
  userId: string;
  userName: string;
  locationName: string | null;
  action: "user.login" | "user.logout";
  timestamp: Date;
};

export type LoginHistoryDay = {
  dateISO: string; // "YYYY-MM-DD", Toronto local
  dateLabel: string; // "Monday, July 7"
  events: LoginEvent[];
};

/**
 * Login/logout history for the last 30 days, grouped by local (Toronto) day,
 * newest first. Managers (STORE_MANAGER+) see everyone within their location
 * scope; everyone else sees only their own login/logout events — this report
 * surfaces other people's activity, so it's gated the same way team-visibility
 * reports (e.g. Daily Summary) already are in this app.
 */
export async function getLoginHistory(
  user: { id: string; role: Role; locationId: string | null },
  days = 30,
): Promise<LoginHistoryDay[]> {
  const cutoff = new Date(Date.now() - days * 86400000);
  const canSeeTeam = isManager(user.role);
  const scopeIds = canSeeTeam ? await scopedLocationIds(user) : null;

  const logs = await prisma.activityLog.findMany({
    where: {
      action: { in: ["user.login", "user.logout"] },
      timestamp: { gte: cutoff },
      ...(canSeeTeam
        ? scopeIds !== null
          ? { user: { locationId: { in: scopeIds } } }
          : {}
        : { userId: user.id }),
    },
    include: { user: { select: { name: true, location: { select: { name: true } } } } },
    orderBy: { timestamp: "desc" },
    take: 1000,
  });

  const byDay = new Map<string, LoginEvent[]>();
  for (const log of logs) {
    const dateISO = localDateISO(log.timestamp, APP_TZ);
    const event: LoginEvent = {
      id: log.id,
      userId: log.userId,
      userName: log.user.name,
      locationName: log.user.location?.name ?? null,
      action: log.action as "user.login" | "user.logout",
      timestamp: log.timestamp,
    };
    const bucket = byDay.get(dateISO);
    if (bucket) bucket.push(event);
    else byDay.set(dateISO, [event]);
  }

  return [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([dateISO, events]) => ({
      dateISO,
      dateLabel: new Date(`${dateISO}T12:00:00Z`).toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
      }),
      events,
    }));
}
