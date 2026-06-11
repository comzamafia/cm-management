import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTaskDetail } from "@/lib/queries";
import { TYPE_LABEL, STATUS_LABEL, PRIORITY_LABEL, formatDateTime } from "@/lib/labels";
import { StatusBadge, PriorityBadge } from "@/components/Badge";
import { TaskActions } from "@/components/TaskActions";
import { TaskEditModal } from "@/components/TaskEditModal";
import { TaskComments } from "@/components/TaskComments";

const ACTION_LABEL: Record<string, string> = {
  "task.created": "Task created",
  "task.edited": "Task details updated",
  "task.status_changed": "Status changed",
  "task.verified": "Task verified",
  "task.assigned": "Assignment updated",
  "task.due_changed": "Due date changed",
  "task.commented": "Comment added",
};

function activityDescription(action: string, meta: Record<string, unknown>): string {
  if (action === "task.status_changed") {
    const from = STATUS_LABEL[(meta.from as keyof typeof STATUS_LABEL)] ?? (meta.from as string);
    const to = STATUS_LABEL[(meta.to as keyof typeof STATUS_LABEL)] ?? (meta.to as string);
    return `${from} → ${to}`;
  }
  return "";
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="text-[#726973]">Sign in to view tasks.</div>;
  }

  const { id } = await params;
  const task = await getTaskDetail(id, user);
  if (!task) notFound();

  const manager = isManager(user.role);

  const [assignees, categories] = manager
    ? await Promise.all([
        prisma.user.findMany({
          where: { locationId: task.locationId, status: "ACTIVE" },
          orderBy: { name: "asc" },
          select: { id: true, name: true, role: true },
        }),
        prisma.category.findMany({
          where: {
            OR: [{ locationId: task.locationId }, { locationId: null }],
          },
          orderBy: [{ position: "asc" }, { name: "asc" }],
          select: { id: true, name: true, color: true },
        }),
      ])
    : [[], []];

  const taskForEdit = {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    assigneeId: task.assigneeId,
    categoryId: task.categoryId,
    department: task.department,
    dueAt: task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : null,
    proofRequired: task.proofRequired,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Back link */}
      <Link href="/tasks" className="text-sm text-[#726973] hover:text-[#440E48] hover:underline">
        ← Back to tasks
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] font-bold tracking-tight text-[#140516] leading-snug">
            {task.title}
          </h1>
          <p className="mt-1 text-sm text-[#726973]">
            {TYPE_LABEL[task.type]} task · {task.location.name}
            {task.category && (
              <>
                {" · "}
                <span
                  className="inline-flex items-center gap-1"
                  style={{ color: task.category.color }}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: task.category.color }}
                  />
                  {task.category.name}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.derivedStatus} />
          {manager && (
            <TaskEditModal
              task={taskForEdit}
              users={assignees as { id: string; name: string; role: string }[]}
              categories={categories}
            />
          )}
        </div>
      </div>

      {/* Details card */}
      <div className="m-card p-6 space-y-5">
        {task.description && (
          <p className="whitespace-pre-wrap text-sm text-[#433745] leading-relaxed">{task.description}</p>
        )}

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
          <Field label="Assignee" value={task.assignee?.name ?? "Unassigned"} />
          <Field label="Assigned by" value={task.assigner.name} />
          <Field label="Department" value={task.department ?? "—"} />
          <Field label="Due" value={formatDateTime(task.dueAt)} highlight={task.derivedStatus === "OVERDUE"} />
          <Field label="Created" value={formatDateTime(task.createdAt)} />
          <Field label="Photo proof" value={task.proofRequired ? "Required" : "Not required"} />
        </dl>
      </div>

      {/* Actions card */}
      <div className="m-card p-6">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#726973]">Actions</h2>
        <TaskActions
          taskId={task.id}
          status={task.derivedStatus}
          proofRequired={task.proofRequired}
          canVerify={manager}
        />
      </div>

      {/* Activity timeline */}
      {task.activity.length > 0 && (
        <div className="m-card p-6">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#726973]">Activity</h2>
          <ol className="relative border-l border-[#E4DDE4] space-y-4 ml-3">
            {task.activity.map((log) => {
              const meta = (log.meta ?? {}) as Record<string, unknown>;
              const desc = activityDescription(log.action, meta);
              return (
                <li key={log.id} className="ml-5">
                  <span className="absolute -left-[5px] flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[#E4DDE4] ring-2 ring-white" />
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="text-sm font-semibold text-[#140516]">{log.user.name}</span>
                    <span className="text-sm text-[#726973]">
                      {ACTION_LABEL[log.action] ?? log.action}
                    </span>
                    {desc && (
                      <span className="rounded-full bg-[#F0EBF0] px-2 py-0.5 text-xs font-medium text-[#440E48]">
                        {desc}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-[#A19BA2]">{formatDateTime(log.timestamp)}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Completion history */}
      {task.completions.length > 0 && (
        <div className="m-card p-6">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#726973]">Completion History</h2>
          <ul className="space-y-4">
            {task.completions.map((c) => {
              const photos = (c.photoUrls as string[]) ?? [];
              return (
                <li key={c.id} className="rounded-xl border border-[#E4DDE4] bg-[#F9F6F9] p-4 text-sm">
                  <div className="text-[#140516]">
                    Completed by{" "}
                    <span className="font-semibold">{c.completedBy.name}</span>{" "}
                    <span className="text-[#726973]">· {formatDateTime(c.completedAt)}</span>
                  </div>
                  {c.verifiedBy && (
                    <div className="mt-1 text-[#440E48] font-medium">
                      Verified by {c.verifiedBy.name} · {formatDateTime(c.verifiedAt)}
                    </div>
                  )}
                  {photos.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {photos.map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={url}
                          src={url}
                          alt="proof photo"
                          className="h-20 w-20 rounded-lg object-cover ring-1 ring-[#E4DDE4]"
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

      {/* Attachments */}
      {task.attachments.length > 0 && (
        <div className="m-card p-6">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#726973]">Attachments</h2>
          <ul className="space-y-1 text-sm">
            {task.attachments.map((a) => (
              <li key={a.id}>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#440E48] hover:underline"
                >
                  [{a.type}] {a.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Comments */}
      <TaskComments
        taskId={task.id}
        comments={task.comments.map((c) => ({
          id: c.id,
          body: c.body,
          createdAt: c.createdAt,
          user: c.user,
        }))}
        currentUserId={user.id}
        canManage={manager}
      />
    </div>
  );
}

function Field({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-[#A19BA2]">{label}</dt>
      <dd className={`mt-0.5 font-medium ${highlight ? "text-[#e2445c]" : "text-[#140516]"}`}>
        {value}
      </dd>
    </div>
  );
}
