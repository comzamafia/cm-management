import Link from "next/link";
import { getCurrentUser, isManager, locationScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getChecklistTemplates } from "@/lib/checklists";
import { FREQUENCY_LABEL, PRIORITY_LABEL, WEEK_DAYS } from "@/lib/labels";
import { ToggleTemplateButton, GenerateNowButton, AssignTemplateSelect } from "@/components/ChecklistActions";

export default async function ChecklistsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="text-slate-600">Select a user from the top-right switcher.</div>;
  }
  if (!isManager(user.role)) {
    return <div className="text-slate-600">Checklist templates are visible to managers and above.</div>;
  }

  const [templates, scope] = await Promise.all([
    getChecklistTemplates(),
    locationScopeWhere(user),
  ]);

  // Employees to show in the assign dropdown — scoped to manager's location(s).
  const assignableUsers = await prisma.user.findMany({
    where: { ...scope, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Checklist Templates</h1>
          <p className="text-sm text-slate-500">
            Templates auto-generate recurring tasks on schedule. Use "Generate Now" to test.
          </p>
        </div>
        <div className="flex gap-2">
          <GenerateNowButton />
          <Link
            href="/checklists/new"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            + New Template
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {templates.map((t) => {
          const items = t.items as string[];
          const scheduleLabel =
            t.frequency === "WEEKLY" && t.weekDay !== null
              ? `${FREQUENCY_LABEL[t.frequency]} on ${WEEK_DAYS[t.weekDay]}`
              : t.frequency === "MONTHLY" && t.monthDay !== null
              ? `${FREQUENCY_LABEL[t.frequency]} on day ${t.monthDay}`
              : FREQUENCY_LABEL[t.frequency];

          return (
            <div
              key={t.id}
              className={`rounded-lg border bg-white p-5 ${t.active ? "border-slate-200" : "border-slate-100 opacity-60"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-slate-900">{t.name}</h2>
                    {!t.active && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>{scheduleLabel} · {t.autoGenerateHour}:00 UTC</span>
                    <span>{PRIORITY_LABEL[t.priority]} priority</span>
                    {t.department && <span>{t.department}</span>}
                    {t.proofRequired && <span className="text-amber-600">📷 Proof required</span>}
                    <span>{t.location ? t.location.name : "All locations"}</span>
                    <span className="text-slate-400">Generated {t._count.generations}×</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-500">{items.length} item{items.length !== 1 ? "s" : ""}</span>
                  <ToggleTemplateButton id={t.id} active={t.active} />
                </div>
              </div>

              {/* Assign to employee */}
              <div className="mt-3">
                <AssignTemplateSelect
                  templateId={t.id}
                  assigneeId={t.assignee?.id ?? null}
                  assigneeName={t.assignee?.name ?? null}
                  users={assignableUsers}
                />
              </div>

              <ul className="mt-3 space-y-1">
                {items.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-slate-300">☐</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {templates.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
            No checklist templates yet.{" "}
            <Link href="/checklists/new" className="text-slate-700 underline">
              Create your first one.
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
