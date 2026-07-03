import { redirect } from "next/navigation";
import { getCurrentUser, atLeast } from "@/lib/auth";
import { Role } from "@prisma/client";
import {
  getReservationLocations,
  getReservationDashboard,
  getReservationImportDates,
} from "@/lib/reservations";
import { ReservationUpload } from "@/components/ReservationUpload";
import { ReservationDashboard } from "@/components/ReservationDashboard";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ locationId?: string; date?: string }>;

export default async function ReservationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!atLeast(user.role, Role.SHIFT_LEAD)) redirect("/dashboard");

  const sp = await searchParams;
  const locations = await getReservationLocations();

  if (locations.length === 0) {
    return (
      <div className="m-card p-8 text-center text-sm text-[#726973]">
        No location in scope — ask an owner to assign you to a branch.
      </div>
    );
  }

  const selectedLocationId =
    sp.locationId && locations.some((l) => l.id === sp.locationId)
      ? sp.locationId
      : (user.locationId && locations.some((l) => l.id === user.locationId) ? user.locationId : locations[0].id);

  const [result, importDates] = await Promise.all([
    getReservationDashboard(selectedLocationId, sp.date),
    getReservationImportDates(selectedLocationId),
  ]);

  const locationName = locations.find((l) => l.id === selectedLocationId)?.name ?? "";

  return (
    <div className="reservation-theme -m-4 min-h-screen p-4 pb-24 lg:-m-8 lg:p-8" style={{ background: "var(--rv-bg)" }}>
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: "var(--rv-navy)" }}>
              CHIANG MAI — {locationName.toUpperCase()}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-[3px] w-8 rounded-full" style={{ background: "var(--rv-blue)" }} />
              <span className="text-sm font-bold tracking-wide" style={{ color: "var(--rv-blue)" }}>HOST DASHBOARD</span>
            </div>
          </div>
          {result && (
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ background: "var(--rv-card)", borderColor: "var(--rv-border)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--rv-navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              <div className="text-xs" style={{ color: "var(--rv-navy)" }}>
                <div className="font-bold uppercase tracking-wide">Last Updated: {result.uploadedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                <div style={{ color: "var(--rv-text-soft)" }}>{new Date(`${result.businessDate}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}</div>
              </div>
            </div>
          )}
        </div>

        <ReservationUpload locationId={selectedLocationId} />

        <ReservationDashboard
          result={result}
          importDates={importDates}
          locations={locations}
          selectedLocationId={selectedLocationId}
        />
      </div>
    </div>
  );
}
