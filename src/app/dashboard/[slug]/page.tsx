import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, isManager, scopedLocationIds } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ManagerDashboard } from "@/components/ManagerDashboard";

export const dynamic = "force-dynamic";

// Vanity per-person board: /dashboard/<first-name> (e.g. /dashboard/manali) opens
// that teammate's full operational board — the same view a manager gets from the
// "View as" control, just as a shareable/bookmarkable URL.
//
// Access is manager-only and scope-aware: a Store Manager can only resolve people
// at their own location(s); Area Managers / Owners can resolve anyone. The static
// sibling routes (who / what / when / where) take precedence over this dynamic
// segment in Next.js, so they are never captured here.

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export default async function PersonBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ noteDate?: string }>;
}) {
  const [user, { slug }, { noteDate }] = await Promise.all([getCurrentUser(), params, searchParams]);

  if (!user) {
    return <div className="m-card p-8 text-center text-[#726973]">Sign in to view this board.</div>;
  }
  if (!isManager(user.role)) {
    return <div className="m-card p-8 text-center text-[#726973]">Manager access required to view another person&apos;s board.</div>;
  }

  // Only people inside the viewer's location scope are resolvable.
  const ids = await scopedLocationIds(user); // null = all locations
  const candidates = await prisma.user.findMany({
    where: { status: "ACTIVE", ...(ids === null ? {} : { locationId: { in: ids } }) },
    select: { id: true, name: true, role: true, locationId: true, location: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  // Prefer an exact full-name slug; otherwise a unique first-name match. If a
  // bare first name is ambiguous (two "Emma"s in scope), fall through to 404 so
  // we never guess the wrong person — use the fuller slug in that case.
  const target =
    candidates.find((u) => slugify(u.name) === slug) ??
    (() => {
      const firsts = candidates.filter((u) => slugify(u.name.split(/\s+/)[0]) === slug);
      return firsts.length === 1 ? firsts[0] : undefined;
    })();

  if (!target) notFound();

  // Reuse the board's own "view as" path — it re-checks scope and renders the
  // subject's board read-only (manager-only affordances stay gated by role).
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-[#726973]">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <span>/</span>
        <span className="font-medium text-[#140516]">{target.name}</span>
      </div>
      <ManagerDashboard user={user} viewAs={target.id} noteDate={noteDate} />
    </div>
  );
}
