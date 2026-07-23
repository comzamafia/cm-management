import { getCurrentUser, atLeast } from "@/lib/auth";
import { Role } from "@prisma/client";
import { getSyncedRollup } from "@/lib/ops-sync";
import { renderOpsRollupPdf } from "@/lib/ops-rollup-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required.", { status: 401 });
  if (!atLeast(user.role, Role.STORE_MANAGER)) return new Response("Access restricted.", { status: 403 });

  const date = new URL(req.url).searchParams.get("date") ?? undefined;
  const { day, locations } = await getSyncedRollup(date);

  const pdf = await renderOpsRollupPdf(day, locations);
  const filename = `logbook-${day}.pdf`;

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
