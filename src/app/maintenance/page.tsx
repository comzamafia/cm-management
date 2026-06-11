import Link from "next/link";
import { MaintenanceStatus } from "@prisma/client";
import { Role } from "@prisma/client";
import { getCurrentUser, atLeast } from "@/lib/auth";
import { getMaintenanceRequests } from "@/lib/maintenance";
import {
  MAINTENANCE_AREA_LABEL,
  MAINTENANCE_STATUS_LABEL,
  MAINTENANCE_STATUS_STYLE,
  PRIORITY_LABEL,
  PRIORITY_STYLE,
  formatDateTime,
} from "@/lib/labels";

const FILTERS: (MaintenanceStatus | "ALL")[] = ["ALL", "OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to view maintenance.</div>;

  const { status } = await searchParams;
  const validStatuses = Object.values(MaintenanceStatus) as string[];
  const statusFilter = status && validStatuses.includes(status) ? (status as MaintenanceStatus) : undefined;
  const active: string = statusFilter ?? "ALL";
  const requests = await getMaintenanceRequests(statusFilter ? { status: statusFilter } : {});
  const canExport = atLeast(user.role, Role.STORE_MANAGER);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">Maintenance</h1>
          <p className="mt-1 text-sm text-[#726973]">Report and track repair requests across locations.</p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <a
              href="/api/reports?type=maintenance"
              className="rounded-xl border border-[#E4DDE4] px-3 py-2.5 text-sm font-medium text-[#726973] transition hover:bg-[#F0EBF0]"
            >
              ↓ CSV
            </a>
          )}
          <Link
            href="/maintenance/new"
            className="rounded-xl bg-[#440E48] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5A1560]"
          >
            + Report issue
          </Link>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const href = f === "ALL" ? "/maintenance" : `/maintenance?status=${f}`;
          const on = active === f;
          return (
            <Link
              key={f}
              href={href}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                on ? "bg-[#440E48] text-white" : "bg-[#F0EBF0] text-[#726973] hover:bg-[#E4DDE4]"
              }`}
            >
              {f === "ALL" ? "All" : MAINTENANCE_STATUS_LABEL[f]}
            </Link>
          );
        })}
      </div>

      {requests.length === 0 ? (
        <div className="m-card p-10 text-center text-sm text-[#A19BA2]">No requests here.</div>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <Link
              key={r.id}
              href={`/maintenance/${r.id}`}
              className="m-card flex items-center gap-4 p-4 transition hover:shadow-md"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${MAINTENANCE_STATUS_STYLE[r.status]}`}
                  >
                    {MAINTENANCE_STATUS_LABEL[r.status]}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${PRIORITY_STYLE[r.priority]}`}
                  >
                    {PRIORITY_LABEL[r.priority]}
                  </span>
                </div>
                <p className="mt-1 truncate font-semibold text-[#140516]">{r.title}</p>
                <p className="mt-0.5 text-xs text-[#726973]">
                  {MAINTENANCE_AREA_LABEL[r.area]} · {r.location.name} · {formatDateTime(r.createdAt)}
                  {r.assignedTo && ` · ${r.assignedTo.name}`}
                  {r.vendor && ` · ${r.vendor}`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
