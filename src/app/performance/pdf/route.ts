import { getCurrentUser, isManager } from "@/lib/auth";
import { localDateISO } from "@/lib/time";
import { fetchServerPerformance, configuredBranches } from "@/lib/boh-api";
import { renderPerformancePdf } from "@/lib/performance-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RANGE_DAYS = 366;

function validDate(s: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}
function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86400000,
  );
}

export async function GET(req: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required.", { status: 401 });
  if (!isManager(user.role) && user.role !== "SHIFT_LEAD") {
    return new Response("Manager access required.", { status: 403 });
  }

  const url = new URL(req.url);
  const branches = configuredBranches();

  // Resolve branch: requested → first with a key → first in registry.
  const reqBranch = url.searchParams.get("branch");
  const requested = reqBranch ? branches.find((b) => b.branch.id === reqBranch) : undefined;
  const fallback = branches.find((b) => b.hasKey) ?? branches[0];
  const selected = requested ?? fallback;

  // Resolve range (defaults: last 7 days, Toronto business dates).
  const today = localDateISO(new Date());
  const defaultFrom = localDateISO(new Date(Date.parse(`${today}T00:00:00Z`) - 6 * 86400000));
  const qFrom = url.searchParams.get("from");
  const qTo = url.searchParams.get("to");
  let from = validDate(qFrom) ? qFrom : defaultFrom;
  let to = validDate(qTo) ? qTo : today;
  if (from > to) [from, to] = [to, from];
  if (daysBetween(from, to) > MAX_RANGE_DAYS) {
    return new Response(`Date range exceeds ${MAX_RANGE_DAYS} days.`, { status: 400 });
  }

  const result = await fetchServerPerformance(selected.branch.id, from, to);
  if (!result.ok) {
    return new Response(`Could not load report: ${result.error}`, { status: 502 });
  }

  const pdf = await renderPerformancePdf(result.data);
  const filename = `server-performance-${selected.branch.id}-${from}_${to}.pdf`;

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
