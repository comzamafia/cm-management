import Link from "next/link";
import { getCurrentUser, isManager } from "@/lib/auth";
import { getDashboardData, getMyWork } from "@/lib/queries";
import { getAnnouncements } from "@/lib/announcements";
import { getOpenMaintenanceCount } from "@/lib/maintenance";
import { getLowStockCount } from "@/lib/inventory";
import {
  formatDateTime,
  STATUS_LABEL,
  STATUS_STYLE,
  PRIORITY_LABEL,
  PRIORITY_STYLE,
  ROLE_LABEL,
} from "@/lib/labels";
import { TaskStatus } from "@prisma/client";

const STATUS_HEX: Record<TaskStatus, string> = {
  PENDING: "#A19BA2",
  IN_PROGRESS: "#F4A626",
  DONE: "#1DBA87",
  VERIFIED: "#440E48",
  OVERDUE: "#e2445c",
};

const ACTION_VERB: Record<string, string> = {
  "task.created": "created",
  "task.assigned": "assigned",
  "task.status_changed": "updated",
  "task.verified": "verified",
  "announcement.created": "posted",
  "project.created": "created project",
};

function rateColor(rate: number | null): string {
  if (rate === null) return "text-[#A19BA2]";
  if (rate >= 90) return "text-[#1DBA87]";
  if (rate >= 80) return "text-[#F4A626]";
  return "text-[#e2445c]";
}

function dueLabel(dueAt: Date | null): { text: string; tone: string } {
  if (!dueAt) return { text: "No due date", tone: "text-[#A19BA2]" };
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const days = Math.floor((dueAt.getTime() - start.getTime()) / 86400000);
  if (days < 0) return { text: `${-days}d overdue`, tone: "text-[#e2445c] font-semibold" };
  if (days === 0) return { text: "Due today", tone: "text-[#F4A626] font-semibold" };
  if (days === 1) return { text: "Due tomorrow", tone: "text-[#726973]" };
  return { text: `Due in ${days}d`, tone: "text-[#726973]" };
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="m-card p-8 text-center text-[#726973]">
        Sign in to view your workspace.
      </div>
    );
  }

  const manager = isManager(user.role);
  const firstName = user.name.split(/\s+/)[0];
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const [myWork, announcements] = await Promise.all([
    getMyWork(user),
    getAnnouncements(),
  ]);
  const news = announcements.slice(0, 4);

  return (
    <div className="space-y-7">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">
            Welcome back, {firstName} 👋
          </h1>
          <p className="mt-0.5 text-sm text-[#726973]">
            {today} · {ROLE_LABEL[user.role]}
            {user.location ? ` · ${user.location.name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/tasks?mine=1" className="m-btn-ghost">My Tasks</Link>
          <Link href="/calendar" className="m-btn-ghost">Calendar</Link>
        </div>
      </div>

      {/* Personal quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="My open tasks" value={myWork.counts.open} color="#440E48" />
        <StatTile label="Due today" value={myWork.counts.dueToday} color="#F4A626" />
        <StatTile label="Overdue" value={myWork.counts.overdue} color="#e2445c" />
        <StatTile label="Completed" value={myWork.counts.doneThisCycle} color="#1DBA87" />
      </div>

      {/* My Tasks + Company News */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* My Tasks */}
        <section className="m-card p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#726973]">My Tasks</h2>
            <Link href="/tasks?mine=1" className="text-xs font-semibold text-[#440E48] hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {myWork.tasks.map((t) => {
              const due = dueLabel(t.dueAt);
              return (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className="flex items-center gap-3 rounded-lg border border-[#EEEAEE] px-3 py-2.5 transition-colors hover:bg-[#FAF6FA]"
                >
                  <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_HEX[t.derivedStatus] }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[#140516]">{t.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[#A19BA2]">
                      <span>{t.location.name}</span>
                      <span className={due.tone}>· {due.text}</span>
                    </div>
                  </div>
                  <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 sm:inline-flex ${PRIORITY_STYLE[t.priority]}`}>
                    {PRIORITY_LABEL[t.priority]}
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${STATUS_STYLE[t.derivedStatus]}`}>
                    {STATUS_LABEL[t.derivedStatus]}
                  </span>
                </Link>
              );
            })}
            {myWork.tasks.length === 0 && (
              <div className="rounded-lg border border-dashed border-[#E4DDE4] py-8 text-center text-sm text-[#A19BA2]">
                You&apos;re all caught up. 🎉
              </div>
            )}
          </div>
        </section>

        {/* Company News */}
        <section className="m-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#726973]">Company News</h2>
            <Link href="/announcements" className="text-xs font-semibold text-[#440E48] hover:underline">All →</Link>
          </div>
          <div className="space-y-3">
            {news.map((a) => (
              <Link
                key={a.id}
                href="/announcements"
                className="block rounded-lg border border-[#EEEAEE] p-3 transition-colors hover:bg-[#FAF6FA]"
              >
                <div className="flex items-start gap-2">
                  {a.pinned && <span title="Pinned">📌</span>}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-[#140516]">{a.title}</span>
                      {!a.readByMe && <span className="shrink-0 rounded-full bg-[#F4A626] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">New</span>}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-[#726973]">{a.body}</p>
                    <div className="mt-1 text-[11px] text-[#A19BA2]">
                      {a.authorName}{a.locationName ? ` · ${a.locationName}` : " · Company-wide"} · {formatDateTime(a.createdAt)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {news.length === 0 && (
              <div className="rounded-lg border border-dashed border-[#E4DDE4] py-8 text-center text-sm text-[#A19BA2]">
                No announcements yet.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ───────── Management overview (managers & owners only) ───────── */}
      {manager && <ManagementOverview user={user} />}
    </div>
  );
}

async function ManagementOverview({ user }: { user: { role: import("@prisma/client").Role; locationId: string | null } }) {
  const { byLocation, overdueTasks, activity, totals } = await getDashboardData(user);
  const [openMaintenance, lowStock] = await Promise.all([
    getOpenMaintenanceCount(),
    getLowStockCount(),
  ]);

  return (
    <div className="space-y-5 border-t border-[#E4DDE4] pt-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[#140516]">Management Overview</h2>
          <p className="text-sm text-[#726973]">Team performance across your locations.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/reports?period=weekly" className="m-btn-ghost">↓ Weekly CSV</a>
          <a href="/api/reports?period=monthly" className="m-btn-ghost">↓ Monthly CSV</a>
        </div>
      </div>

      {/* Drill-downs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/dashboard/who",  emoji: "👤", label: "People",      desc: "On-time rates", color: "#440E48" },
          { href: "/dashboard/what", emoji: "📋", label: "Departments", desc: "By department", color: "#9F4000" },
          { href: "/dashboard/when", emoji: "📅", label: "Trends",      desc: "14-day trend", color: "#1DBA87" },
          { href: "/projects",       emoji: "🗂️", label: "Projects",    desc: "Project board", color: "#F4A626" },
        ].map((d) => (
          <Link key={d.href} href={d.href} className="m-card group flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl" style={{ backgroundColor: `${d.color}1a` }}>{d.emoji}</span>
            <div className="min-w-0">
              <div className="font-bold" style={{ color: d.color }}>{d.label}</div>
              <div className="truncate text-xs text-[#726973]">{d.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Ops tiles */}
      <div className="grid grid-cols-2 gap-3">
        <OpsTile href="/maintenance" emoji="🔧" label="Open Maintenance" count={openMaintenance} accent="#9F4000" />
        <OpsTile href="/inventory" emoji="📦" label="Low-stock Items" count={lowStock} accent="#e2445c" />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Total" value={totals.total} color="#140516" />
        <Kpi label="Pending" value={totals.pending} color="#A19BA2" />
        <Kpi label="In Progress" value={totals.inProgress} color="#F4A626" />
        <Kpi label="Done" value={totals.done} color="#1DBA87" />
        <Kpi label="Verified" value={totals.verified} color="#440E48" />
        <Kpi label="Overdue" value={totals.overdue} color="#e2445c" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Completion by location */}
        <section className="m-card p-5">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#726973]">Completion by Location</h3>
          <div className="space-y-3.5">
            {byLocation.map((l) => (
              <div key={l.location.id} className="flex items-center gap-3">
                <Link href={`/dashboard/where/${l.location.id}`} className="w-28 truncate text-sm font-semibold text-[#140516] hover:text-[#440E48]">
                  {l.location.name}
                </Link>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#eee]">
                  <div className="h-full rounded-full" style={{ width: `${l.rate ?? 0}%`, backgroundColor: (l.rate ?? 0) >= 90 ? "#1DBA87" : (l.rate ?? 0) >= 80 ? "#F4A626" : "#e2445c" }} />
                </div>
                <span className={`w-14 text-right text-sm font-bold ${rateColor(l.rate)}`}>
                  {l.rate === null ? "—" : `${l.rate}%`}
                </span>
                {l.overdue > 0 && <span className="m-pill bg-[#e2445c] !px-2 !py-0.5 text-[11px]">{l.overdue}</span>}
              </div>
            ))}
            {byLocation.length === 0 && <Empty>No locations in scope.</Empty>}
          </div>
        </section>

        {/* Overdue tasks */}
        <section className="m-card p-5">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#726973]">Overdue Tasks</h3>
          <div className="space-y-2">
            {overdueTasks.slice(0, 6).map((t) => {
              const days = t.dueAt ? Math.floor((Date.now() - t.dueAt.getTime()) / 86400000) : 0;
              return (
                <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-center justify-between gap-2 overflow-hidden rounded-lg border border-[#f3d3d8] bg-[#fdf2f3] px-3 py-2.5 transition-colors hover:bg-[#fbe6e9]">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="h-8 w-1.5 shrink-0 rounded-full bg-[#e2445c]" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#140516]">{t.title}</div>
                      <div className="text-xs text-[#726973]">
                        {t.location.name}{t.assignee ? ` · ${t.assignee.name}` : " · unassigned"}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-[#e2445c]">{days > 0 ? `${days}d late` : "due today"}</span>
                </Link>
              );
            })}
            {overdueTasks.length === 0 && <Empty>Nothing overdue. 🎉</Empty>}
          </div>
        </section>
      </div>

      {/* Activity feed */}
      <section className="m-card p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#726973]">Live Activity Feed</h3>
        <ul className="divide-y divide-[#f3eef3]">
          {activity.map((a) => {
            const meta = a.meta as { title?: string; to?: string };
            return (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-[#433745]">
                  <span className="font-semibold text-[#140516]">{a.user.name}</span>{" "}
                  {ACTION_VERB[a.action] ?? a.action}{" "}
                  {meta.title ? <span className="font-semibold text-[#140516]">“{meta.title}”</span> : a.entity}
                  {a.location ? <span className="text-[#A19BA2]"> @ {a.location.name}</span> : null}
                  {meta.to ? <span className="text-[#A19BA2]"> → {meta.to}</span> : null}
                </span>
                <span className="shrink-0 text-xs text-[#A19BA2]">{formatDateTime(a.timestamp)}</span>
              </li>
            );
          })}
          {activity.length === 0 && <Empty>No recent activity.</Empty>}
        </ul>
      </section>
    </div>
  );
}

function StatTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="m-card relative overflow-hidden p-4">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
      <div className="text-3xl font-extrabold" style={{ color }}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-[#726973]">{label}</div>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="m-card relative overflow-hidden p-4">
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
      <div className="text-3xl font-extrabold" style={{ color }}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-[#726973]">{label}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-3 text-sm text-[#A19BA2]">{children}</div>;
}

function OpsTile({ href, emoji, label, count, accent }: { href: string; emoji: string; label: string; count: number; accent: string }) {
  const active = count > 0;
  return (
    <Link href={href} className="m-card group flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl" style={{ backgroundColor: `${accent}1a` }}>{emoji}</span>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold" style={{ color: active ? accent : "#A19BA2" }}>{count}</div>
        <div className="truncate text-xs font-medium text-[#726973]">{label}</div>
      </div>
    </Link>
  );
}
