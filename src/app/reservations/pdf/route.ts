import { getCurrentUser, atLeast } from "@/lib/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getReservationDashboard } from "@/lib/reservations";
import { renderReservationPdf } from "@/lib/reservation-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required.", { status: 401 });
  if (!atLeast(user.role, Role.SHIFT_LEAD)) return new Response("Access restricted.", { status: 403 });

  const url = new URL(req.url);
  const locationId = url.searchParams.get("locationId");
  const date = url.searchParams.get("date") ?? undefined;
  if (!locationId) return new Response("Missing locationId.", { status: 400 });

  const [result, location] = await Promise.all([
    getReservationDashboard(locationId, date),
    prisma.location.findUnique({ where: { id: locationId }, select: { name: true } }),
  ]);
  if (!result || !location) return new Response("No reservation data found for that location/date.", { status: 404 });

  const pdf = await renderReservationPdf(location.name, result.businessDate, result.uploadedAt, result.uploadedByName, result.dashboard);
  const filename = `reservations-${location.name.toLowerCase().replace(/\s+/g, "-")}-${result.businessDate}.pdf`;

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
