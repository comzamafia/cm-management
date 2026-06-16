import Link from "next/link";
import { getCurrentUser, isManager } from "@/lib/auth";
import { getMyWork } from "@/lib/queries";
import { getAnnouncements } from "@/lib/announcements";
import { ManagerDashboard } from "@/components/ManagerDashboard";
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

function dueLabel(dueAt: Date | null): { text: string; tone: string } {
  if (!dueAt) return { text: "No due date", tone: "text-[#A19BA2]" };
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const days = Math.floor((dueAt.getTime() - start.getTime()) / 86400000);
  if (days < 0) return { text: `${-days}d overdue`, tone: "text-[#e2445c] font-semibold" };
  if (days === 0) return { text: "Due today", tone: "text-[#F4A626] font-semibold" };
  if (days === 1) return { text: "Due tomorrow", tone: "text-[#726973]" };
  return { text: `Due in ${days}d`, tone: "text-[#726973]" };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="m-card p-8 text-center text-[#726973]">
        Sign in to view your workspace.
      </div>
    );
  }

  // Managers & owners get the operational dashboard; front-line staff keep the
  // simpler personal-first view below.
  if (isManager(user.role)) {
    const { view } = await searchParams;
    return <ManagerDashboard user={user} viewAs={view} />;
  }

  const firstName = user.name.split(/\s+/)[0];
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const [myWork, announcements] = await Promise.all([getMyWork(user), getAnnouncements()]);
  const news = announcements.slice(0, 4);

  return (
    <div className="space-y-7">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">Welcome back, {firstName} 👋</h1>
          <p className="mt-0.5 text-sm text-[#726973]">{today} · {ROLE_LABEL[user.role]}{user.location ? ` · ${user.location.name}` : ""}</p>
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
        <section className="m-card p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#726973]">My Tasks</h2>
            <Link href="/tasks?mine=1" className="text-xs font-semibold text-[#440E48] hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {myWork.tasks.map((t) => {
              const due = dueLabel(t.dueAt);
              return (
                <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-center gap-3 rounded-lg border border-[#EEEAEE] px-3 py-2.5 transition-colors hover:bg-[#FAF6FA]">
                  <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_HEX[t.derivedStatus] }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[#140516]">{t.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[#A19BA2]">
                      <span>{t.location.name}</span>
                      <span className={due.tone}>· {due.text}</span>
                    </div>
                  </div>
                  <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 sm:inline-flex ${PRIORITY_STYLE[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${STATUS_STYLE[t.derivedStatus]}`}>{STATUS_LABEL[t.derivedStatus]}</span>
                </Link>
              );
            })}
            {myWork.tasks.length === 0 && (
              <div className="rounded-lg border border-dashed border-[#E4DDE4] py-8 text-center text-sm text-[#A19BA2]">You&apos;re all caught up. 🎉</div>
            )}
          </div>
        </section>

        <section className="m-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#726973]">Company News</h2>
            <Link href="/announcements" className="text-xs font-semibold text-[#440E48] hover:underline">All →</Link>
          </div>
          <div className="space-y-3">
            {news.map((a) => (
              <Link key={a.id} href="/announcements" className="block rounded-lg border border-[#EEEAEE] p-3 transition-colors hover:bg-[#FAF6FA]">
                <div className="flex items-start gap-2">
                  {a.pinned && <span title="Pinned">📌</span>}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-[#140516]">{a.title}</span>
                      {!a.readByMe && <span className="shrink-0 rounded-full bg-[#F4A626] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">New</span>}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-[#726973]">{a.body}</p>
                    <div className="mt-1 text-[11px] text-[#A19BA2]">{a.authorName}{a.locationName ? ` · ${a.locationName}` : " · Company-wide"} · {formatDateTime(a.createdAt)}</div>
                  </div>
                </div>
              </Link>
            ))}
            {news.length === 0 && (
              <div className="rounded-lg border border-dashed border-[#E4DDE4] py-8 text-center text-sm text-[#A19BA2]">No announcements yet.</div>
            )}
          </div>
        </section>
      </div>
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
