import { getCurrentUser, locationScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOverdue } from "@/lib/labels";
import { CalendarClient, type CalendarItem } from "@/components/CalendarClient";

export const dynamic = "force-dynamic";

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

  // Fetch a padded window so timezone offsets near month edges still land correctly.
  const from = new Date(year, monthIndex, 1);
  from.setDate(from.getDate() - 7);
  const to = new Date(year, monthIndex + 1, 1);
  to.setDate(to.getDate() + 7);

  const scope = await locationScopeWhere(user);
  const tasks = await prisma.task.findMany({
    where: { ...scope, dueAt: { gte: from, lt: to } },
    include: {
      location: { select: { name: true } },
      assignee: { select: { name: true } },
    },
    orderBy: { dueAt: "asc" },
  });

  const items: CalendarItem[] = tasks
    .filter((t) => t.dueAt)
    .map((t) => ({
      id: t.id,
      title: t.title,
      dueAt: t.dueAt!.toISOString(),
      status: isOverdue(t.dueAt, t.status) ? "OVERDUE" : t.status,
      locationName: t.location.name,
      assigneeName: t.assignee?.name ?? null,
    }));

  return (
    <div className="mx-auto max-w-5xl">
      <CalendarClient month={monthStr} items={items} />
    </div>
  );
}
