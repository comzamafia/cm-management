import { getCurrentUser, locationScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCalToken } from "@/lib/cal-token";

export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// GET /api/calendar/ics
// Session auth (browser download) OR ?uid=<id>&tok=<hmac> (Outlook webcal subscription).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const uid = url.searchParams.get("uid");
  const tok = url.searchParams.get("tok");

  let user;
  if (uid && tok) {
    if (!verifyCalToken(uid, tok)) {
      return new Response("Invalid token", { status: 401 });
    }
    user = await prisma.user.findUnique({
      where: { id: uid },
      include: { location: true },
    });
  } else {
    user = await getCurrentUser();
  }

  if (!user) return new Response("Unauthorized", { status: 401 });

  const scope = await locationScopeWhere(user);
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 86400000);
  const to = new Date(now.getTime() + 90 * 86400000);

  const [tasks, maintenance] = await Promise.all([
    prisma.task.findMany({
      where: { ...scope, dueAt: { gte: from, lt: to } },
      include: { assignee: { select: { name: true } }, location: { select: { name: true } } },
      orderBy: { dueAt: "asc" },
    }),
    prisma.maintenanceRequest.findMany({
      where: { ...scope, status: { not: "CLOSED" }, createdAt: { gte: from, lt: to } },
      select: { id: true, title: true, createdAt: true, priority: true, status: true, location: { select: { name: true } } },
    }),
  ]);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CM Operations//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:CM Operations",
    "X-WR-TIMEZONE:America/Toronto",
    "X-WR-CALDESC:Tasks and maintenance from CM Operations",
  ];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://cm-management.vercel.app";

  for (const t of tasks) {
    if (!t.dueAt) continue;
    const end = new Date(t.dueAt.getTime() + 3600000);
    const desc = [
      `Status: ${t.status}`,
      t.assignee ? `Assignee: ${t.assignee.name}` : "",
      t.location ? `Location: ${t.location.name}` : "",
    ].filter(Boolean).join("\\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:task-${t.id}@cm-ops`,
      `DTSTAMP:${icsDate(now)}`,
      `DTSTART:${icsDate(t.dueAt)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${esc(t.title)}`,
      `DESCRIPTION:${esc(desc)}`,
      `URL:${appUrl}/tasks/${t.id}`,
      "END:VEVENT",
    );
  }

  for (const r of maintenance) {
    const end = new Date(r.createdAt.getTime() + 3600000);
    const desc = [
      `Priority: ${r.priority}`,
      `Status: ${r.status}`,
      r.location ? `Location: ${r.location.name}` : "",
    ].filter(Boolean).join("\\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:maint-${r.id}@cm-ops`,
      `DTSTAMP:${icsDate(now)}`,
      `DTSTART:${icsDate(r.createdAt)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${esc("[Maintenance] " + r.title)}`,
      `DESCRIPTION:${esc(desc)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cm-calendar.ics"',
      "Cache-Control": "no-store, no-cache",
    },
  });
}
