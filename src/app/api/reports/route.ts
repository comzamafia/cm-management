import { NextResponse } from "next/server";
import { buildTasksCsv } from "@/lib/reports";
import { getCurrentUser } from "@/lib/auth";
import { atLeast } from "@/lib/auth";
import { Role } from "@prisma/client";

// GET /api/reports?period=weekly|monthly
// Returns a CSV file download. Scoped to the current user's locations.
// Only STORE_MANAGER and above may export.

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!atLeast(user.role, Role.STORE_MANAGER)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const period = new URL(req.url).searchParams.get("period") === "monthly" ? "monthly" : "weekly";
  const csv = await buildTasksCsv(user, period);

  const filename = `cm-ops-tasks-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
