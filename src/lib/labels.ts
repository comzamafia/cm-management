import { Frequency, NotificationType, Priority, Role, TaskStatus, TaskType } from "@prisma/client";

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Owner / Senior Management",
  AREA_MANAGER: "Area / Operations Manager",
  STORE_MANAGER: "Store Manager",
  SHIFT_LEAD: "Shift Lead",
  EMPLOYEE: "Employee",
  NEW_HIRE: "New Hire",
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
  VERIFIED: "Verified",
  OVERDUE: "Overdue",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const TYPE_LABEL: Record<TaskType, string> = {
  ONE_OFF: "One-off",
  RECURRING: "Recurring",
};

export const STATUS_STYLE: Record<TaskStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700 ring-slate-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 ring-blue-200",
  DONE: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  VERIFIED: "bg-violet-100 text-violet-700 ring-violet-200",
  OVERDUE: "bg-red-100 text-red-700 ring-red-200",
};

export const PRIORITY_STYLE: Record<Priority, string> = {
  LOW: "bg-slate-100 text-slate-600 ring-slate-200",
  MEDIUM: "bg-sky-100 text-sky-700 ring-sky-200",
  HIGH: "bg-amber-100 text-amber-800 ring-amber-200",
  CRITICAL: "bg-red-100 text-red-700 ring-red-200",
};

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

export const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  TASK_ASSIGNED: "Task Assigned",
  TASK_NEAR_DUE: "Due Soon",
  TASK_OVERDUE: "Overdue",
  ESCALATION: "Escalation",
  CHECKLIST_GENERATED: "Checklist Generated",
};

export const NOTIFICATION_TYPE_STYLE: Record<NotificationType, string> = {
  TASK_ASSIGNED: "text-blue-600",
  TASK_NEAR_DUE: "text-amber-600",
  TASK_OVERDUE: "text-red-600",
  ESCALATION: "text-red-700",
  CHECKLIST_GENERATED: "text-emerald-600",
};

export function isOverdue(dueAt: Date | null, status: TaskStatus): boolean {
  if (!dueAt) return false;
  if (status === "DONE" || status === "VERIFIED") return false;
  return dueAt.getTime() < Date.now();
}
