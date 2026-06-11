import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentUser, atLeast } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMaintenanceDetail } from "@/lib/maintenance";
import { MaintenanceActions } from "@/components/MaintenanceActions";
import {
  MAINTENANCE_AREA_LABEL,
  MAINTENANCE_STATUS_LABEL,
  MAINTENANCE_STATUS_STYLE,
  PRIORITY_LABEL,
  PRIORITY_STYLE,
  formatDateTime,
} from "@/lib/labels";

export default async function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to view this request.</div>;

  const { id } = await params;
  const req = await getMaintenanceDetail(id);
  if (!req) notFound();

  const canManage = atLeast(user.role, Role.STORE_MANAGER);
  const canAct = atLeast(user.role, Role.SHIFT_LEAD);
  const photos = (req.photoUrls as string[]) ?? [];

  const assignables = canManage
    ? await prisma.user.findMany({
        where: { locationId: req.locationId, status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/maintenance" className="text-sm text-[#726973] hover:text-[#440E48] hover:underline">
        ← Back to maintenance
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] font-bold leading-snug tracking-tight text-[#140516]">{req.title}</h1>
          <p className="mt-1 text-sm text-[#726973]">
            {MAINTENANCE_AREA_LABEL[req.area]} · {req.location.name} · reported by {req.reportedBy.name} ·{" "}
            {formatDateTime(req.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${PRIORITY_STYLE[req.priority]}`}
          >
            {PRIORITY_LABEL[req.priority]}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${MAINTENANCE_STATUS_STYLE[req.status]}`}
          >
            {MAINTENANCE_STATUS_LABEL[req.status]}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="m-card space-y-5 p-6">
        {req.description && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#433745]">{req.description}</p>
        )}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
          <Field label="Assigned to" value={req.assignedTo?.name ?? "Unassigned"} />
          <Field label="Vendor" value={req.vendor ?? "—"} />
          <Field label="Cost" value={req.cost != null ? `$${req.cost.toFixed(2)}` : "—"} />
          {req.resolvedBy && <Field label="Resolved by" value={req.resolvedBy.name} />}
          {req.resolvedAt && <Field label="Resolved at" value={formatDateTime(req.resolvedAt)} />}
        </dl>
        {req.resolutionNote && (
          <div className="rounded-xl bg-[#F0F9F4] p-4 text-sm text-[#0F5132]">
            <span className="font-semibold">Resolution: </span>
            {req.resolutionNote}
          </div>
        )}
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {photos.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="maintenance photo" className="h-24 w-24 rounded-lg object-cover ring-1 ring-[#E4DDE4]" />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <MaintenanceActions
        id={req.id}
        status={req.status}
        assignedToId={req.assignedToId}
        vendor={req.vendor}
        canManage={canManage}
        canAct={canAct}
        assignables={assignables}
      />

      {/* Activity */}
      {req.activity.length > 0 && (
        <div className="m-card p-6">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#726973]">Activity</h2>
          <ol className="ml-3 space-y-3 border-l border-[#E4DDE4]">
            {req.activity.map((log) => {
              const meta = (log.meta ?? {}) as Record<string, unknown>;
              const desc =
                log.action === "maintenance.status_changed"
                  ? `${meta.from} → ${meta.to}`
                  : log.action.replace("maintenance.", "").replace("_", " ");
              return (
                <li key={log.id} className="ml-5">
                  <span className="absolute -ml-[26px] mt-1.5 h-2.5 w-2.5 rounded-full bg-[#E4DDE4] ring-2 ring-white" />
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="text-sm font-semibold text-[#140516]">{log.user.name}</span>
                    <span className="text-sm text-[#726973]">{desc}</span>
                    <span className="ml-auto text-xs text-[#A19BA2]">{formatDateTime(log.timestamp)}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-[#A19BA2]">{label}</dt>
      <dd className="mt-0.5 font-medium text-[#140516]">{value}</dd>
    </div>
  );
}
