import { getCurrentUser, locationScopeWhere, scopedLocationIds } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOverdue, STATUS_LABEL, MAINTENANCE_STATUS_LABEL, FREQUENCY_LABEL } from "@/lib/labels";
import { TaskStatus } from "@prisma/client";
import { CalendarClient, type CalendarItem } from "@/components/CalendarClient";

export const dynamic = "force-dynamic";

const STATUS_HEX: Record<TaskStatus, string> = {
  PENDING: "#A19BA2",
  IN_PROGRESS: "#F4A626",
  DONE: "#1DBA87",
  VERIFIED: "#440E48",
  OVERDUE: "#e2445c",
};
const MAINTENANCE_HEX = "#9F4000";
const CHECKLIST_HEX = "#5B8DD9";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to view the calendar.</div>;

  const { month } = await searchParams;
  const monthStr = /^\d{4}-\d{2}$/.test(month ?? "") ? (month as string) : currentMonth();
  const [year, m1] = monthStr.split("-").map(Number);
  const monthIndex = m1 - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // Padded window so timezone offsets near month edges still land correctly.
  const from = new Date(year, monthIndex, 1);
  from.setDate(from.getDate() - 7);
  const to = new Date(year, monthIndex + 1, 1);
  to.setDate(to.getDate() + 7);

  const scope = await locationScopeWhere(user);
  const scopeIds = await scopedLocationIds(user); // null = all locations

  const [tasks, maintenance, templates] = await Promise.all([
    prisma.task.findMany({
      where: { ...scope, dueAt: { gte: from, lt: to } },
      include: { assignee: { select: { name: true } } },
      orderBy: { dueAt: "asc" },
    }),
    prisma.maintenanceRequest.findMany({
      where: { ...scope, status: { not: "CLOSED" }, createdAt: { gte: from, lt: to } },
      select: { id: true, title: true, createdAt: true, priority: true, status: true, assignedTo: { select: { name: true } } },
    }),
    prisma.checklistTemplate.findMany({
      where: {
        active: true,
        ...(scopeIds === null ? {} : { OR: [{ locationId: { in: scopeIds } }, { locationId: null }] }),
      },
      select: { id: true, name: true, frequency: true, weekDay: true, monthDay: true },
    }),
  ]);

  const items: CalendarItem[] = [];

  // Tasks — on their due day, colored by derived status.
  for (const t of tasks) {
    if (!t.dueAt) continue;
    const status = isOverdue(t.dueAt, t.status) ? "OVERDUE" : t.status;
    items.push({
      id: `task-${t.id}`,
      title: t.title,
      dueAt: t.dueAt.toISOString(),
      color: STATUS_HEX[status],
      href: `/tasks/${t.id}`,
      kind: "task",
      hint: STATUS_LABEL[status] + (t.assignee ? ` · ${t.assignee.name}` : ""),
      statusLabel: STATUS_LABEL[status],
      assigneeName: t.assignee?.name ?? null,
    });
  }

  // Maintenance — on the reported day.
  for (const r of maintenance) {
    items.push({
      id: `maint-${r.id}`,
      title: r.title,
      dueAt: r.createdAt.toISOString(),
      color: MAINTENANCE_HEX,
      href: `/maintenance/${r.id}`,
      kind: "maintenance",
      hint: `${r.priority} · reported`,
      statusLabel: MAINTENANCE_STATUS_LABEL[r.status],
      assigneeName: r.assignedTo?.name ?? null,
    });
  }

  // Checklist templates — synthetic occurrences across this month from their schedule.
  // Noon UTC keeps each occurrence on the intended local calendar day.
  const noonUtc = (day: number) =>
    new Date(Date.UTC(year, monthIndex, day, 12, 0, 0)).toISOString();
  for (const tpl of templates) {
    const days: number[] = [];
    if (tpl.frequency === "DAILY") {
      for (let d = 1; d <= daysInMonth; d++) days.push(d);
    } else if (tpl.frequency === "WEEKLY" && tpl.weekDay != null) {
      for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(year, monthIndex, d).getDay() === tpl.weekDay) days.push(d);
      }
    } else if (tpl.frequency === "MONTHLY" && tpl.monthDay != null) {
      days.push(Math.min(tpl.monthDay, daysInMonth));
    }
    for (const d of days) {
      items.push({
        id: `chk-${tpl.id}-${d}`,
        title: tpl.name,
        dueAt: noonUtc(d),
        color: CHECKLIST_HEX,
        href: "/checklists",
        kind: "checklist",
        hint: "recurring checklist",
        statusLabel: `${FREQUENCY_LABEL[tpl.frequency]} checklist`,
        assigneeName: null,
      });
    }
  }

  const legend = [
    { label: STATUS_LABEL.PENDING, color: STATUS_HEX.PENDING },
    { label: STATUS_LABEL.IN_PROGRESS, color: STATUS_HEX.IN_PROGRESS },
    { label: STATUS_LABEL.DONE, color: STATUS_HEX.DONE },
    { label: STATUS_LABEL.VERIFIED, color: STATUS_HEX.VERIFIED },
    { label: STATUS_LABEL.OVERDUE, color: STATUS_HEX.OVERDUE },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <CalendarClient month={monthStr} items={items} legend={legend} />
    </div>
  );
}
