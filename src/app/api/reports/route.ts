import { NextResponse } from "next/server";
import { buildTasksCsv, buildMaintenanceCsv, buildInventoryCsv } from "@/lib/reports";
import { getCurrentUser, atLeast } from "@/lib/auth";
import { Role } from "@prisma/client";

// GET /api/reports?type=tasks|maintenance|inventory[&period=weekly|monthly]
// Returns a CSV file download. Scoped to the current user's locations.
// Only STORE_MANAGER and above may export.

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!atLeast(user.role, Role.STORE_MANAGER)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const type = sp.get("type") ?? "tasks";
  const today = new Date().toISOString().slice(0, 10);

  let csv: string;
  let name: string;

  if (type === "maintenance") {
    csv = await buildMaintenanceCsv(user);
    name = `cm-maintenance-${today}.csv`;
  } else if (type === "inventory") {
    csv = await buildInventoryCsv(user);
    name = `cm-inventory-${today}.csv`;
  } else {
    const period = sp.get("period") === "monthly" ? "monthly" : "weekly";
    csv = await buildTasksCsv(user, period);
    name = `cm-ops-tasks-${period}-${today}.csv`;
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
