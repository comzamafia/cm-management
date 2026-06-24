import { getCurrentUser } from "@/lib/auth";
import { canSeePlan, getActionPlan, getActionPlanTasks } from "@/lib/action-plan";
import { isoWeekId, monthId, localDateISO } from "@/lib/time";
import { renderActionPlanPdf } from "@/lib/action-plan-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required.", { status: 401 });
  if (!(await canSeePlan("marketing", user))) {
    return new Response("Access restricted.", { status: 403 });
  }

  const now = new Date();
  const week = isoWeekId(now);
  const month = monthId(now);
  const todayISO = localDateISO(now);
  const [entries, tasks] = await Promise.all([
    getActionPlan("marketing", week, month),
    getActionPlanTasks("marketing"),
  ]);

  const pdf = await renderActionPlanPdf(
    entries, todayISO, week, month,
    tasks.weekly, tasks.monthly, tasks.vendors,
  );
  const filename = `marketing-plan-${week}-${month}.pdf`;

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
