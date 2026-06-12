import { Frequency, InventoryUnit, MaintenanceArea, MaintenanceStatus, NotificationType, Priority, ProjectStatus, Role, TaskStatus, TaskType } from "@prisma/client";

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

// ---- Projects (monday "Customer Projects" style) ----

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "Working on it",
  ON_HOLD: "Stuck",
  COMPLETED: "Done",
  CANCELLED: "Cancelled",
};

// Hex used inline for the monday-style colored status cells.
export const PROJECT_STATUS_HEX: Record<ProjectStatus, string> = {
  NOT_STARTED: "#A19BA2",
  IN_PROGRESS: "#F4A626",
  ON_HOLD: "#e2445c",
  COMPLETED: "#1DBA87",
  CANCELLED: "#726973",
};

export const PROJECT_STATUS_STYLE: Record<ProjectStatus, string> = {
  NOT_STARTED: "bg-[#A19BA2] text-white ring-black/5",
  IN_PROGRESS: "bg-[#F4A626] text-white ring-black/5",
  ON_HOLD: "bg-[#e2445c] text-white ring-black/5",
  COMPLETED: "bg-[#1DBA87] text-white ring-black/5",
  CANCELLED: "bg-[#726973] text-white ring-black/5",
};

// Order projects are grouped/shown in on the board.
export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
];

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
  INVENTORY_LOW_STOCK: "Low Stock",
  MAINTENANCE_REPORTED: "Maintenance Reported",
  MAINTENANCE_ASSIGNED: "Maintenance Assigned",
  MAINTENANCE_RESOLVED: "Maintenance Resolved",
  MAINTENANCE_OVERDUE: "Maintenance Overdue",
};

export const NOTIFICATION_TYPE_STYLE: Record<NotificationType, string> = {
  TASK_ASSIGNED: "text-[#5B8DD9]",
  TASK_NEAR_DUE: "text-[#F4A626]",
  TASK_OVERDUE: "text-[#e2445c]",
  ESCALATION: "text-[#9F4000]",
  CHECKLIST_GENERATED: "text-[#1DBA87]",
  DAILY_DIGEST: "text-[#726973]",
  ANNOUNCEMENT: "text-[#440E48]",
  INVENTORY_LOW_STOCK: "text-[#9F4000]",
  MAINTENANCE_REPORTED: "text-[#5B8DD9]",
  MAINTENANCE_ASSIGNED: "text-[#F4A626]",
  MAINTENANCE_RESOLVED: "text-[#1DBA87]",
  MAINTENANCE_OVERDUE: "text-[#e2445c]",
};

// ---- Phase 5: Maintenance + Inventory ----

export const MAINTENANCE_STATUS_LABEL: Record<MaintenanceStatus, string> = {
  OPEN: "Open",
  ACKNOWLEDGED: "Acknowledged",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const MAINTENANCE_STATUS_STYLE: Record<MaintenanceStatus, string> = {
  OPEN: "bg-[#e2445c] text-white ring-black/5",
  ACKNOWLEDGED: "bg-[#5B8DD9] text-white ring-black/5",
  IN_PROGRESS: "bg-[#F4A626] text-white ring-black/5",
  RESOLVED: "bg-[#1DBA87] text-white ring-black/5",
  CLOSED: "bg-[#440E48] text-white ring-black/5",
};

export const MAINTENANCE_AREA_LABEL: Record<MaintenanceArea, string> = {
  EQUIPMENT: "Equipment",
  REFRIGERATION: "Refrigeration",
  PLUMBING: "Plumbing",
  ELECTRICAL: "Electrical",
  HVAC: "HVAC / Air-con",
  STRUCTURAL: "Structural",
  SAFETY: "Safety",
  OTHER: "Other",
};

// Allowed forward transitions for a maintenance request (server-enforced).
export const MAINTENANCE_NEXT: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  OPEN: ["ACKNOWLEDGED", "IN_PROGRESS"],
  ACKNOWLEDGED: ["IN_PROGRESS"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
};

export const INVENTORY_UNIT_LABEL: Record<InventoryUnit, string> = {
  EACH: "each",
  KG: "kg",
  G: "g",
  L: "L",
  ML: "mL",
  BOTTLE: "bottle",
  BOX: "box",
  PACK: "pack",
  CASE: "case",
};

// Re-exported from the single source of truth in ./rules.
export { isOverdue, deriveStatus } from "./rules";
