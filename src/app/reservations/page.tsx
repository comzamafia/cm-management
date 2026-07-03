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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#140516]">Reservation Dashboard</h1>
        <p className="mt-0.5 text-sm text-[#726973]">Daily host dashboard from the reservation-book export.</p>
      </div>

      <ReservationUpload locationId={selectedLocationId} />

      <ReservationDashboard
        result={result}
        importDates={importDates}
        locations={locations}
        selectedLocationId={selectedLocationId}
      />
    </div>
  );
}
