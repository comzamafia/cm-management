import { getCurrentUser, atLeast } from "@/lib/auth";
import { Role } from "@prisma/client";
import { getTodayRollup } from "@/lib/logbook";
import { renderLogbookPdf } from "@/lib/logbook-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required.", { status: 401 });
  if (!atLeast(user.role, Role.STORE_MANAGER)) return new Response("Access restricted.", { status: 403 });

  const date = new URL(req.url).searchParams.get("date") ?? undefined;
  const { day, locations } = await getTodayRollup(date);

  const pdf = await renderLogbookPdf(day, locations);
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
