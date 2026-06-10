import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { buildTasksCsv } from "@/lib/reports";
import { CURRENT_USER_COOKIE } from "@/lib/auth";

// GET /api/reports?period=weekly|monthly
// Returns a CSV file download. Scoped to the current user's locations.
// Only STORE_MANAGER and above may export.

export async function GET(req: Request) {
  const store = await cookies();
  const uid = store.get(CURRENT_USER_COOKIE)?.value;
  if (!uid) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const allowedRoles = ["OWNER", "AREA_MANAGER", "STORE_MANAGER"] as const;
  if (!allowedRoles.includes(user.role as (typeof allowedRoles)[number])) {
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
