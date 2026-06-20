import { getCurrentUser, locationScopeWhere, scopedLocationIds } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCalToken } from "@/lib/cal-token";
import { localDateISO } from "@/lib/time";
import { TaskStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// UTC timestamp form: 20260621T130000Z
function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// All-day DATE form (no time/tz): 20260621
function icsDay(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}

// Fold lines to 75 octets per RFC 5545 (CRLF + single leading space).
function fold(line: string): string {
  if (line.length <= 73) return line;
  const out: string[] = [];
  let rest = line;
  out.push(rest.slice(0, 73));
  rest = rest.slice(73);
  while (rest.length > 72) {
    out.push(" " + rest.slice(0, 72));
    rest = rest.slice(72);
  }
  out.push(" " + rest);
  return out.join("\r\n");
}

const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

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
    user = await prisma.user.findUnique({ where: { id: uid }, include: { location: true } });
  } else {
    user = await getCurrentUser();
  }

  if (!user) return new Response("Unauthorized", { status: 401 });

  const scope = await locationScopeWhere(user);
  const scopeIds = await scopedLocationIds(user); // null = all locations
  const isEmployeeRole = user.role === "EMPLOYEE" || user.role === "NEW_HIRE";
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 86400000);
  const to = new Date(now.getTime() + 90 * 86400000);

  const [tasks, maintenance, templates] = await Promise.all([
    prisma.task.findMany({
      where: {
        ...scope,
        dueAt: { gte: from, lt: to },
        // Drop finished work so Outlook stays uncluttered.
        status: { notIn: [TaskStatus.DONE, TaskStatus.VERIFIED] },
        ...(isEmployeeRole ? { assigneeId: user.id } : {}),
      },
      include: { assignee: { select: { name: true } }, location: { select: { name: true } } },
      orderBy: { dueAt: "asc" },
    }),
    prisma.maintenanceRequest.findMany({
      where: {
        ...scope,
        status: { not: "CLOSED" },
        createdAt: { gte: from, lt: to },
        ...(isEmployeeRole ? { assignedToId: user.id } : {}),
      },
      select: { id: true, title: true, createdAt: true, priority: true, status: true, location: { select: { name: true } } },
    }),
    prisma.checklistTemplate.findMany({
      where: {
        active: true,
        ...(scopeIds === null ? {} : { OR: [{ locationId: { in: scopeIds } }, { locationId: null }] }),
        ...(isEmployeeRole ? { assigneeId: user.id } : {}),
      },
      select: { id: true, name: true, frequency: true, weekDay: true, monthDay: true, location: { select: { name: true } } },
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
    "X-WR-CALDESC:Tasks, maintenance and checklists from CM Operations",
  ];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://cm-management.vercel.app";
  const stamp = icsDate(now);

  // ── Tasks (timed, with a 30-min reminder) ─────────────────────────────────
  for (const t of tasks) {
    if (!t.dueAt) continue;
    const end = new Date(t.dueAt.getTime() + 3600000);
    const desc = [
      `Status: ${t.status}`,
      t.assignee ? `Assignee: ${t.assignee.name}` : "",
      t.location ? `Location: ${t.location.name}` : "",
    ].filter(Boolean).join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:task-${t.id}@cm-ops`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(t.dueAt)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${esc(t.title)}`,
      `DESCRIPTION:${esc(desc)}`,
      `URL:${appUrl}/tasks/${t.id}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT30M",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(t.title)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }

  // ── Maintenance (timed, on reported day) ──────────────────────────────────
  for (const r of maintenance) {
    const end = new Date(r.createdAt.getTime() + 3600000);
    const desc = [
      `Priority: ${r.priority}`,
      `Status: ${r.status}`,
      r.location ? `Location: ${r.location.name}` : "",
    ].filter(Boolean).join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:maint-${r.id}@cm-ops`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(r.createdAt)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${esc("[Maintenance] " + r.title)}`,
      `DESCRIPTION:${esc(desc)}`,
      "END:VEVENT",
    );
  }

  // ── Recurring checklists (all-day, RRULE) ─────────────────────────────────
  // Anchor on a Toronto-local "today" so the recurrence lands on the right day.
  const [ty, tm, td] = localDateISO(now).split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(ty, tm, 0)).getUTCDate();

  for (const tpl of templates) {
    let anchor: Date | null = null;
    let rrule = "";

    if (tpl.frequency === "DAILY") {
      anchor = new Date(Date.UTC(ty, tm - 1, td));
      rrule = "FREQ=DAILY";
    } else if (tpl.frequency === "WEEKLY" && tpl.weekDay != null) {
      const base = new Date(Date.UTC(ty, tm - 1, td));
      const diff = (tpl.weekDay - base.getUTCDay() + 7) % 7;
      anchor = new Date(base.getTime() + diff * 86400000);
      rrule = `FREQ=WEEKLY;BYDAY=${BYDAY[tpl.weekDay]}`;
    } else if (tpl.frequency === "MONTHLY" && tpl.monthDay != null) {
      const day = Math.min(tpl.monthDay, daysInMonth);
      anchor = new Date(Date.UTC(ty, tm - 1, day));
      rrule = `FREQ=MONTHLY;BYMONTHDAY=${tpl.monthDay}`;
    }
    if (!anchor) continue;

    const endDay = new Date(anchor.getTime() + 86400000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:chk-${tpl.id}@cm-ops`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDay(anchor)}`,
      `DTEND;VALUE=DATE:${icsDay(endDay)}`,
      `RRULE:${rrule}`,
      `SUMMARY:${esc("[Checklist] " + tpl.name)}`,
      `DESCRIPTION:${esc(`${tpl.frequency} checklist${tpl.location ? ` · ${tpl.location.name}` : ""}`)}`,
      `URL:${appUrl}/checklists`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  const body = lines.map(fold).join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cm-calendar.ics"',
      "Cache-Control": "no-store, no-cache",
    },
  });
}
