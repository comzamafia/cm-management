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
  PENDING: "bg-[#A19BA2] text-white ring-black/5",
  IN_PROGRESS: "bg-[#F4A626] text-white ring-black/5",
  DONE: "bg-[#1DBA87] text-white ring-black/5",
  VERIFIED: "bg-[#440E48] text-white ring-black/5",
  OVERDUE: "bg-[#e2445c] text-white ring-black/5",
};

export const PRIORITY_STYLE: Record<Priority, string> = {
  LOW: "bg-[#A19BA2] text-white ring-black/5",
  MEDIUM: "bg-[#5B8DD9] text-white ring-black/5",
  HIGH: "bg-[#F4A626] text-white ring-black/5",
  CRITICAL: "bg-[#e2445c] text-white ring-black/5",
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
  DAILY_DIGEST: "Daily Digest",
  ANNOUNCEMENT: "Announcement",
};

export const NOTIFICATION_TYPE_STYLE: Record<NotificationType, string> = {
  TASK_ASSIGNED: "text-[#5B8DD9]",
  TASK_NEAR_DUE: "text-[#F4A626]",
  TASK_OVERDUE: "text-[#e2445c]",
  ESCALATION: "text-[#9F4000]",
  CHECKLIST_GENERATED: "text-[#1DBA87]",
  DAILY_DIGEST: "text-[#726973]",
  ANNOUNCEMENT: "text-[#440E48]",
};

// Re-exported from the single source of truth in ./rules.
export { isOverdue, deriveStatus } from "./rules";
