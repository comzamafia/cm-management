import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, isManager, scopedLocationIds } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserTaskTracker } from "@/lib/queries";
import { ROLE_LABEL } from "@/lib/labels";
import { APP_TZ } from "@/lib/time";
import { TaskTracker } from "@/components/TaskTracker";

export const dynamic = "force-dynamic";

// Per-person tracker: /tracker/<first-name> (e.g. /tracker/manali) opens that
// teammate's Task Tracker. It is read-only for viewers; only the owner viewing
// their own tracker can edit. Access is manager-only and scope-aware, matching
// /dashboard/[slug]. Front-line users reach their own tracker via /tracker.
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export default async function PersonTrackerPage({ params }: { params: Promise<{ slug: string }> }) {
  const [user, { slug }] = await Promise.all([getCurrentUser(), params]);

  if (!user) {
    return <div className="m-card p-8 text-center text-[#726973]">Sign in to view this tracker.</div>;
  }
  if (!isManager(user.role)) {
    return <div className="m-card p-8 text-center text-[#726973]">Manager access required to view another person&apos;s tracker.</div>;
  }

  const ids = await scopedLocationIds(user); // null = all locations
  const candidates = await prisma.user.findMany({
    where: { status: "ACTIVE", ...(ids === null ? {} : { locationId: { in: ids } }) },
    select: { id: true, name: true, role: true, location: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  const target =
    candidates.find((u) => slugify(u.name) === slug) ??
    (() => {
      const firsts = candidates.filter((u) => slugify(u.name.split(/\s+/)[0]) === slug);
      return firsts.length === 1 ? firsts[0] : undefined;
    })();

  if (!target) notFound();

  const data = await getUserTaskTracker(target.id);
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: APP_TZ });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-[#726973] print:hidden">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <span>/</span>
        <span className="font-medium text-[#140516]">{target.name}&apos;s Tracker</span>
      </div>
      <TaskTracker
        name={target.name}
        roleLabel={ROLE_LABEL[target.role]}
        locationName={target.location?.name ?? null}
        todayLabel={today}
        data={data}
        editable={target.id === user.id}
      />
    </div>
  );
}
