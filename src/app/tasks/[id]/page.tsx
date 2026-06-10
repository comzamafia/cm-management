import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, isManager } from "@/lib/auth";
import { getTaskDetail } from "@/lib/queries";
import { TYPE_LABEL, formatDateTime } from "@/lib/labels";
import { StatusBadge, PriorityBadge } from "@/components/Badge";
import { TaskActions } from "@/components/TaskActions";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="text-slate-600">Select a user from the top-right switcher.</div>;
  }

  const { id } = await params;
  const task = await getTaskDetail(id, user);
  if (!task) notFound();

  const canVerify = isManager(user.role);

  return (
    <div className="space-y-6">
      <Link href="/tasks" className="text-sm text-slate-500 hover:underline">
        ← Back to tasks
      </Link>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{task.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{TYPE_LABEL[task.type]} task</p>
          </div>
          <div className="flex gap-2">
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.derivedStatus} />
          </div>
        </div>

        {task.description && (
          <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{task.description}</p>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Field label="Location" value={task.location.name} />
          <Field label="Assignee" value={task.assignee?.name ?? "Unassigned"} />
          <Field label="Assigned by" value={task.assigner.name} />
          <Field label="Department" value={task.department ?? "—"} />
          <Field label="Due" value={formatDateTime(task.dueAt)} />
          <Field label="Proof required" value={task.proofRequired ? "Yes 📷" : "No"} />
          <Field label="Created" value={formatDateTime(task.createdAt)} />
        </dl>
      </div>

      {/* Status actions */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Actions</h2>
        <TaskActions
          taskId={task.id}
          status={task.derivedStatus}
          proofRequired={task.proofRequired}
          canVerify={canVerify}
        />
      </div>

      {/* Attachments */}
      {task.attachments.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Attachments
          </h2>
          <ul className="space-y-1 text-sm">
            {task.attachments.map((a) => (
              <li key={a.id}>
                <a href={a.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  [{a.type}] {a.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Completion history */}
      {task.completions.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Completion History
          </h2>
          <ul className="space-y-3">
            {task.completions.map((c) => {
              const photos = (c.photoUrls as string[]) ?? [];
              return (
                <li key={c.id} className="rounded-md border border-slate-100 bg-slate-50 p-3 text-sm">
                  <div className="text-slate-700">
                    Completed by <span className="font-medium">{c.completedBy.name}</span> ·{" "}
                    {formatDateTime(c.completedAt)}
                  </div>
                  {c.verifiedBy && (
                    <div className="text-violet-700">
                      Verified by {c.verifiedBy.name} · {formatDateTime(c.verifiedAt)}
                    </div>
                  )}
                  {photos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {photos.map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={url}
                          src={url}
                          alt="proof"
                          className="h-20 w-20 rounded object-cover ring-1 ring-slate-200"
                        />
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{value}</dd>
    </div>
  );
}
