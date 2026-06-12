import { getCurrentUser, isManager } from "@/lib/auth";
import { getProjects } from "@/lib/projects";
import { ProjectsView } from "@/components/ProjectsView";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="text-[#726973]">Sign in to view projects.</div>;
  }

  const { rows, users, totals } = await getProjects(user);
  const canEdit = isManager(user.role) || user.role === "SHIFT_LEAD";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">Customer Projects</h1>
          <p className="mt-0.5 text-sm text-[#726973]">
            Track every client project — owner, timeline, budget, and status in one board.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm font-semibold text-[#140516]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#726973" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
          </svg>
          {totals.total} {totals.total === 1 ? "project" : "projects"}
        </span>
      </div>

      <ProjectsView rows={rows} users={users} totals={totals} canEdit={canEdit} />
    </div>
  );
}
