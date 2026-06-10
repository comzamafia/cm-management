import { getCurrentUser, isManager } from "@/lib/auth";
import { getBoard } from "@/lib/board";
import { prisma } from "@/lib/prisma";
import { BoardView, type BoardGroup } from "@/components/BoardView";
import { BoardSetup } from "@/components/BoardSetup";
import { isOverdue } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="text-[#676879]">Sign in to view the board.</div>;
  }

  const { groups, users, totals } = await getBoard(user);
  const canEdit = isManager(user.role) || user.role === "SHIFT_LEAD";

  // Empty board → setup screen (owner can load real data / clear mock).
  if (groups.length === 0) {
    if (user.role === "OWNER") {
      const taskCount = await prisma.task.count();
      return (
        <div className="space-y-6">
          <Header />
          <BoardSetup hasMockData={taskCount > 0} />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <Header />
        <div className="m-card p-8 text-center text-[#676879]">
          No categories yet. Ask an owner to set up the board.
        </div>
      </div>
    );
  }

  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

  const viewGroups: BoardGroup[] = groups.map((g) => ({
    id: g.category.id,
    name: g.category.name,
    color: g.category.color,
    tasks: g.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      overdue: isOverdue(t.dueAt, t.status),
      priority: t.priority,
      dueAt: t.dueAt ? t.dueAt.toISOString() : null,
      assigneeId: t.assigneeId,
      assigneeName: t.assignee?.name ?? null,
    })),
  }));

  return (
    <div className="space-y-6">
      <Header monthLabel={monthLabel} />
      <BoardView groups={viewGroups} users={users} totals={totals} canEdit={canEdit} />
    </div>
  );
}

function Header({ monthLabel }: { monthLabel?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#323338]">Monthly Checklist</h1>
        <p className="mt-0.5 text-sm text-[#676879]">
          Track every close task by category — owner, due date, and status.
        </p>
      </div>
      {monthLabel && (
        <span className="inline-flex items-center gap-2 rounded-lg border border-[#e6e9ef] bg-white px-3 py-2 text-sm font-semibold text-[#323338]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#676879" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {monthLabel}
        </span>
      )}
    </div>
  );
}
