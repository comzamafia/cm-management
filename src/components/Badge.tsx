import { Priority, TaskStatus } from "@prisma/client";
import {
  PRIORITY_LABEL,
  PRIORITY_STYLE,
  STATUS_LABEL,
  STATUS_STYLE,
} from "@/lib/labels";

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${PRIORITY_STYLE[priority]}`}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
