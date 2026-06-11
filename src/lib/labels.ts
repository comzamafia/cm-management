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

// monday.com-style "labels" — solid color fills, white text.
export const STATUS_STYLE: Record<TaskStatus, string> = {
  PENDING: "bg-[#c4c4c4] text-white ring-black/5",
  IN_PROGRESS: "bg-[#fdab3d] text-white ring-black/5",
  DONE: "bg-[#00c875] text-white ring-black/5",
  VERIFIED: "bg-[#a25ddc] text-white ring-black/5",
  OVERDUE: "bg-[#e2445c] text-white ring-black/5",
};

export const PRIORITY_STYLE: Record<Priority, string> = {
  LOW: "bg-[#c4c4c4] text-white ring-black/5",
  MEDIUM: "bg-[#0073ea] text-white ring-black/5",
  HIGH: "bg-[#fdab3d] text-white ring-black/5",
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
  TASK_ASSIGNED: "text-blue-600",
  TASK_NEAR_DUE: "text-amber-600",
  TASK_OVERDUE: "text-red-600",
  ESCALATION: "text-red-700",
  CHECKLIST_GENERATED: "text-emerald-600",
  DAILY_DIGEST: "text-slate-600",
  ANNOUNCEMENT: "text-[#0073ea]",
};

// Re-exported from the single source of truth in ./rules.
export { isOverdue, deriveStatus } from "./rules";
