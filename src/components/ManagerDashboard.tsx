import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isManager, scopedLocationIds } from "@/lib/auth";
import { getMyWork, getManagerDashboard } from "@/lib/queries";
import { ROLE_LABEL, formatDateTime } from "@/lib/labels";
import { APP_TZ } from "@/lib/time";
import { DashboardTodayTasks } from "./DashboardTodayTasks";
import { DashboardCategories } from "./DashboardCategories";
import { DashboardViewAs } from "./DashboardViewAs";
import { DashboardNotesSection } from "./DashboardNotesSection";

type MgrUser = { id: string; name: string; role: Role; locationId: string | null; location: { name: string } | null };

const CADENCE_HEX: Record<"DAILY" | "WEEKLY" | "SCHEDULED", string> = {
  DAILY: "#440E48",
  WEEKLY: "#5B8DD9",
  SCHEDULED: "#F4A626",
};

const ACTION_VERB: Record<string, string> = {
  "task.created": "created", "task.assigned": "assigned", "task.status_changed": "updated",
  "task.verified": "verified", "announcement.created": "posted", "project.created": "created project",
  "compliance.created": "scheduled", "compliance.serviced": "serviced",
};

function upcomingLabel(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso); const t = new Date(); t.setHours(0, 0, 0, 0);
  const days = Math.floor((new Date(iso).setHours(0, 0, 0, 0) - t.getTime()) / 86400000);
  if (days === 1) return "Tomorrow";
  if (days >= 0 && days < 7) return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function ManagerDashboard({ user, viewAs, noteDate }: { user: MgrUser; viewAs?: string; noteDate?: string }) {
  // A manager may view a teammate's board (?view=<id>) — validate location scope.
  let subject: MgrUser = user;
  if (viewAs && viewAs !== user.id && isManager(user.role)) {
    const ids = await scopedLocationIds(user);
    const t = await prisma.user.findUnique({ where: { id: viewAs }, include: { location: { select: { name: true } } } });
    if (t && (ids === null || (t.locationId != null && ids.includes(t.locationId)))) subject = t as MgrUser;
  }
  const viewingOther = subject.id !== user.id;
  const tasksHref = viewingOther ? `/tasks?assigneeId=${subject.id}` : "/tasks";

  const [myWork, md] = await Promise.all([
    getMyWork(subject),
    getManagerDashboard(user, subject.id),
  ]);
  const firstName = subject.name.split(/\s+/)[0];
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: APP_TZ });
  const weekDates = md.planner.weekDates.map((d) => new Date(d));

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">
            {viewingOther ? `${subject.name}'s board` : `Welcome back, ${firstName} 👋`}
          </h1>
          <p className="mt-0.5 text-sm text-[#726973]">
            {viewingOther ? "Viewing as manager · " : `${today} · `}{ROLE_LABEL[subject.role]}{subject.location ? ` · ${subject.location.name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DashboardViewAs users={md.users} currentId={subject.id} meId={user.id} />
          {viewingOther ? (
            <Link href="/dashboard" className="m-btn-ghost">← My board</Link>
          ) : (
            <Link href="/calendar" className="m-btn-ghost">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Calendar
            </Link>
          )}
          <Link href={tasksHref} className="m-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            {viewingOther ? "Their Tasks" : "All Tasks"}
          </Link>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile color="#440E48" value={myWork.counts.open} label="My Tasks" href="/tasks?mine=1"
          icon={<><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/></>} />
        <StatTile color="#F4A626" value={myWork.counts.dueToday} label="Due Today" href="/calendar"
          icon={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />
        <StatTile color="#e2445c" value={myWork.counts.overdue} label="Overdue" href="/tasks"
          icon={<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>} />
        <StatTile color="#1DBA87" value={md.completedToday} label="Completed Today" href="/tasks?status=DONE"
          icon={<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>} />
      </div>

      {/* Today's Tasks + Weekly Planner */}
      <div className="grid gap-5 lg:grid-cols-5">
        <DashboardTodayTasks tasks={md.todayTasks} pending={md.pendingChecklists} users={md.users} canEdit />
        <section className="m-card lg:col-span-2">
          <div className="flex items-center gap-2 px-5 py-4">
            <span className="text-[#440E48]"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/></svg></span>
            <h2 className="text-base font-bold text-[#140516]">Weekly Planner</h2>
          </div>
          <div className="overflow-x-auto px-3 pb-4">
            <table className="w-full min-w-[420px]">
              <thead>
                <tr>
                  <th className="w-40" />
                  {weekDates.map((d, i) => (
                    <th key={i} className="px-1 pb-2 text-center">
                      <div className="text-[10px] font-semibold uppercase text-[#A19BA2]">{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
                      <div className="text-[11px] text-[#726973]">{d.getDate()}</div>
                      <div className="mx-auto mt-1 grid h-5 w-5 place-items-center rounded-full bg-[#f3eef3] text-[10px] font-bold text-[#726973]">{md.planner.dayCounts[i]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {md.planner.rows.map((r, ri) => (
                  <tr key={ri} className="border-t border-[#f4f0f4]">
                    <td className="py-1.5 pr-2"><span className="block truncate text-xs text-[#140516]" title={r.label}>{r.label}</span></td>
                    {weekDates.map((_, i) => (
                      <td key={i} className="px-1 py-1.5 text-center">
                        {r.days.includes(i) && <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: CADENCE_HEX[r.cadence] }} />}
                      </td>
                    ))}
                  </tr>
                ))}
                {md.planner.rows.length === 0 && (
                  <tr><td colSpan={8} className="py-6 text-center text-xs text-[#A19BA2]">No recurring items this week.</td></tr>
                )}
              </tbody>
            </table>
            <div className="mt-3 flex flex-wrap items-center gap-4 px-2 text-[11px] text-[#726973]">
              {(["DAILY", "WEEKLY", "SCHEDULED"] as const).map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: CADENCE_HEX[c] }} />{c[0] + c.slice(1).toLowerCase()}</span>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Overdue · Upcoming · Quick Links · Task Categories */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {/* Overdue */}
        <section className="m-card p-5">
          <CardHead title="Overdue Tasks" href="/tasks" />
          <div className="space-y-2">
            {md.overdueTasks.slice(0, 4).map((t) => {
              const days = t.dueAt ? Math.floor((Date.now() - new Date(t.dueAt).getTime()) / 86400000) : 0;
              return (
                <Link key={t.id} href={`/tasks/${t.id}`} className="block rounded-lg border border-[#f3d3d8] bg-[#fdf2f3] px-3 py-2.5 transition-colors hover:bg-[#fbe6e9]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-[#140516]">{t.title}</span>
                    <span className="shrink-0 text-xs font-bold text-[#e2445c]">{days > 0 ? `${days}d late` : "due today"}</span>
                  </div>
                  <div className="text-xs text-[#726973]">{t.locationName}</div>
                </Link>
              );
            })}
            {md.overdueTasks.length === 0 && <Empty>Nothing overdue. 🎉</Empty>}
          </div>
        </section>

        {/* Upcoming */}
        <section className="m-card p-5">
          <CardHead title="Upcoming" href="/calendar" />
          <ul className="space-y-2.5">
            {md.upcoming.map((t) => (
              <li key={t.id}>
                <Link href={`/tasks/${t.id}`} className="flex items-center gap-2.5 hover:opacity-80">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f3eef3] text-[#726973]"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[#140516]">{t.title}</div>
                    <div className="text-xs text-[#A19BA2]">{t.locationName}</div>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-[#726973]">{upcomingLabel(t.dueAt)}</span>
                </Link>
              </li>
            ))}
            {md.upcoming.length === 0 && <Empty>Nothing scheduled.</Empty>}
          </ul>
        </section>

        {/* Quick Links */}
        <section className="m-card p-5">
          <h3 className="mb-3 text-base font-bold text-[#140516]">Quick Links</h3>
          <div className="space-y-1">
            <QuickLink href="/tasks/new" label="Add Task" icon={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>} />
            <QuickLink href="/checklists/new" label="Create Checklist" icon={<><path d="M11 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6"/><path d="m9 11 3 3L22 4"/></>} />
            <QuickLink href="/projects" label="New Project" icon={<><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2"/></>} />
            <QuickLink href="/calendar" label="View Calendar" icon={<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>} />
          </div>
          <div className="mt-3 border-t border-[#f3eef3] pt-3">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">Reports</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <Link href="/reports/daily" className="font-semibold text-[#440E48] hover:underline">Daily Summary</Link>
              <Link href="/dashboard/who" className="text-[#440E48] hover:underline">People</Link>
              <Link href="/dashboard/what" className="text-[#440E48] hover:underline">Departments</Link>
              <Link href="/dashboard/when" className="text-[#440E48] hover:underline">Trends</Link>
              <a href="/api/reports?period=weekly" className="text-[#726973] hover:underline">↓ Weekly CSV</a>
              <a href="/api/reports?period=monthly" className="text-[#726973] hover:underline">↓ Monthly CSV</a>
            </div>
          </div>
        </section>

        {/* Task Categories */}
        <DashboardCategories categories={md.categories} canEdit />
      </div>

      {/* Activity feed */}
      <section className="m-card p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">My Recent Activity</h3>
        <ul className="divide-y divide-[#f3eef3]">
          {md.activity.slice(0, 8).map((a) => {
            const meta = a.meta as { title?: string; to?: string };
            return (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-[#433745]">
                  <span className="font-semibold text-[#140516]">{a.user.name}</span> {ACTION_VERB[a.action] ?? a.action}{" "}
                  {meta.title ? <span className="font-semibold text-[#140516]">“{meta.title}”</span> : a.entity}
                  {a.location ? <span className="text-[#A19BA2]"> @ {a.location.name}</span> : null}
                </span>
                <span className="shrink-0 text-xs text-[#A19BA2]">{formatDateTime(a.timestamp)}</span>
              </li>
            );
          })}
          {md.activity.length === 0 && <Empty>No recent activity.</Empty>}
        </ul>
      </section>

      {/* Daily notes (your own log, regardless of whose board you're viewing) */}
      <DashboardNotesSection userId={user.id} noteDate={noteDate} />
    </div>
  );
}

function StatTile({ color, value, label, href, icon }: { color: string; value: number; label: string; href: string; icon: React.ReactNode }) {
  return (
    <div className="m-card p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: color }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
        </span>
        <div>
          <div className="text-3xl font-extrabold leading-none text-[#140516]">{value}</div>
          <div className="mt-1 text-sm font-medium text-[#726973]">{label}</div>
        </div>
      </div>
      <Link href={href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold" style={{ color }}>View all →</Link>
    </div>
  );
}

function CardHead({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-base font-bold text-[#140516]">{title}</h3>
      <Link href={href} className="text-xs font-semibold text-[#440E48] hover:underline">View all</Link>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[#FAF6FA]">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f3eef3] text-[#440E48]">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      </span>
      <span className="flex-1 text-sm font-semibold text-[#140516]">{label}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9C4C9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-3 text-sm text-[#A19BA2]">{children}</div>;
}
