import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/labels";
import { startOfDayTZ, APP_TZ } from "@/lib/time";
import { AuditLogsFilter } from "./AuditLogsFilter";

export const dynamic = "force-dynamic";

const SUJEE_ID = "cmq92qov50001jo04684n5q3c";
const PER_PAGE = 50;

const ACTION_LABEL: Record<string, string> = {
  "task.created": "Task Created",
  "task.edited": "Task Edited",
  "task.status_changed": "Status Changed",
  "task.assigned": "Task Assigned",
  "task.verified": "Task Verified",
  "task.deleted": "Task Deleted",
  "task.overdue": "Task Overdue",
  "task.archived": "Task Archived",
  "task.unarchived": "Task Restored",
  "task.bulk_archived": "Bulk Auto-Archive",
  "task.commented": "Comment Added",
  "task.due_changed": "Due Date Changed",
  "task.attachment_added": "Attachment Added",
  "task.attachment_removed": "Attachment Removed",
  "user.login": "User Login",
  "user.created": "User Created",
  "user.updated": "User Updated",
  "compliance.created": "Compliance Scheduled",
  "compliance.serviced": "Compliance Serviced",
  "compliance.updated": "Compliance Updated",
  "compliance.deleted": "Compliance Deleted",
  "compliance.commented": "Compliance Comment",
  "maintenance.reported": "Maintenance Reported",
  "maintenance.assigned": "Maintenance Assigned",
  "maintenance.status_changed": "Maintenance Updated",
  "maintenance.sla_breached": "SLA Breached",
  "maintenance.commented": "Maintenance Comment",
  "project.created": "Project Created",
  "project.status_changed": "Project Status",
  "project.renamed": "Project Renamed",
  "project.deleted": "Project Deleted",
  "project.budget_changed": "Budget Changed",
  "project.owner_changed": "Owner Changed",
  "project.priority_changed": "Priority Changed",
  "project.file_added": "File Added",
  "project.file_removed": "File Removed",
  "project.client_changed": "Client Changed",
  "project.timeline_changed": "Timeline Changed",
  "announcement.created": "Announcement Posted",
  "checklist.updated": "Checklist Updated",
  "inventory.count_submitted": "Inventory Count",
  "inventory.item_created": "Inventory Item Added",
  "inventory.item_archived": "Inventory Item Archived",
  "category.created": "Category Created",
  "category.renamed": "Category Renamed",
  "category.deleted": "Category Deleted",
  "course.created": "Course Created",
  "course.updated": "Course Updated",
  "course.deleted": "Course Deleted",
  "lesson.added": "Lesson Added",
  "lesson.updated": "Lesson Updated",
  "lesson.deleted": "Lesson Deleted",
  "training.created": "Training Created",
  "location.created": "Location Created",
  "board.setup": "Board Setup",
  "compliance.overdue": "Compliance Overdue",
};

const ACTION_COLOR: Record<string, string> = {
  "task.created": "bg-[#5B8DD91a] text-[#5B8DD9]",
  "task.status_changed": "bg-[#1DBA871a] text-[#1DBA87]",
  "task.verified": "bg-[#1DBA871a] text-[#1DBA87]",
  "task.deleted": "bg-[#e2445c1a] text-[#e2445c]",
  "task.overdue": "bg-[#e2445c1a] text-[#e2445c]",
  "user.login": "bg-[#4401481a] text-[#440E48]",
  "user.created": "bg-[#F4A6261a] text-[#F4A626]",
  "maintenance.sla_breached": "bg-[#e2445c1a] text-[#e2445c]",
  "maintenance.reported": "bg-[#F4A6261a] text-[#F4A626]",
  "compliance.serviced": "bg-[#1DBA871a] text-[#1DBA87]",
};

function actionBadge(action: string) {
  const label = ACTION_LABEL[action] ?? action;
  const color = ACTION_COLOR[action] ?? "bg-[#A19BA21a] text-[#726973]";
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${color}`}>
      {label}
    </span>
  );
}

function entityLink(action: string, entityId: string, meta: Record<string, unknown>) {
  const title = typeof meta.title === "string" ? meta.title : null;
  if (action.startsWith("task.")) {
    return title ? (
      <Link href={`/tasks/${entityId}`} className="font-medium text-[#440E48] hover:underline">
        {title}
      </Link>
    ) : null;
  }
  if (action.startsWith("project.")) {
    return title ? (
      <Link href={`/projects/${entityId}`} className="font-medium text-[#440E48] hover:underline">
        {title}
      </Link>
    ) : null;
  }
  if (action.startsWith("maintenance.")) {
    return title ? (
      <Link href={`/maintenance/${entityId}`} className="font-medium text-[#440E48] hover:underline">
        {title}
      </Link>
    ) : null;
  }
  return title ? <span className="text-[#433745]">{title}</span> : null;
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AuditLogsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  if (!user || user.id !== SUJEE_ID) redirect("/dashboard");

  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : "");

  const userId = get("userId");
  const group = get("group");
  const locationId = get("locationId");
  const from = get("from");
  const to = get("to");
  const page = Math.max(1, parseInt(get("page") || "1", 10));

  // Build where clause
  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (group) where.action = { startsWith: `${group}.` };
  if (locationId) where.locationId = locationId;
  if (from || to) {
    const gte = from ? startOfDayTZ(new Date(from + "T00:00:00"), APP_TZ) : undefined;
    const lte = to ? new Date(startOfDayTZ(new Date(to + "T00:00:00"), APP_TZ).getTime() + 86400000) : undefined;
    where.timestamp = { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
  }

  const [total, logs, allUsers, allLocations] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        user: { select: { id: true, name: true, role: true } },
        location: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.location.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  function pageUrl(p: number) {
    const next = new URLSearchParams();
    if (userId) next.set("userId", userId);
    if (group) next.set("group", group);
    if (locationId) next.set("locationId", locationId);
    if (from) next.set("from", from);
    if (to) next.set("to", to);
    if (p > 1) next.set("page", String(p));
    const qs = next.toString();
    return `/audit-logs${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#140516]">Audit Logs</h1>
          <p className="mt-0.5 text-sm text-[#726973]">
            {total.toLocaleString()} event{total !== 1 ? "s" : ""} recorded
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="m-card p-5">
        <Suspense>
          <AuditLogsFilter users={allUsers} locations={allLocations} />
        </Suspense>
      </div>

      {/* Table */}
      <div className="m-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[#eee] bg-[#faf8fa] text-left text-[10px] font-bold uppercase tracking-wider text-[#A19BA2]">
              <tr>
                <th className="px-5 py-3 w-44">Time</th>
                <th className="px-3 py-3 w-40">User</th>
                <th className="px-3 py-3 w-44">Action</th>
                <th className="px-3 py-3">Detail</th>
                <th className="px-3 py-3 w-36">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3eef3]">
              {logs.map((log) => {
                const meta = (log.meta ?? {}) as Record<string, unknown>;
                return (
                  <tr key={log.id} className="hover:bg-[#faf8fa]">
                    <td className="px-5 py-2.5 text-xs text-[#A19BA2] tabular-nums whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-[#140516]">{log.user.name}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {actionBadge(log.action)}
                    </td>
                    <td className="px-3 py-2.5 max-w-xs">
                      <div className="truncate">
                        {entityLink(log.action, log.entityId, meta) ?? (
                          <span className="text-[#A19BA2] text-xs">{log.entity} · {log.entityId.slice(0, 8)}</span>
                        )}
                        {typeof meta.to === "string" && (
                          <span className="ml-2 text-xs text-[#A19BA2]">→ {meta.to}</span>
                        )}
                        {typeof meta.name === "string" && log.action === "user.login" && (
                          <span className="text-[#726973]">{meta.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[#726973]">
                      {log.location?.name ?? <span className="text-[#C9C4C9]">—</span>}
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-[#A19BA2]">
                    No activity found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#f3eef3] px-5 py-3">
            <p className="text-xs text-[#A19BA2]">
              Page {page} of {totalPages} · {total.toLocaleString()} total
            </p>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link href={pageUrl(page - 1)} className="rounded-lg border border-[#E4DDE4] px-3 py-1.5 text-xs font-semibold text-[#726973] hover:bg-[#FAF6FA]">
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link href={pageUrl(page + 1)} className="rounded-lg border border-[#440E48] px-3 py-1.5 text-xs font-semibold text-[#440E48] hover:bg-[#FAF6FA]">
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
