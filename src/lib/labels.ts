import { ComplianceCategory, ComplianceInterval, Frequency, InventoryUnit, MaintenanceArea, MaintenanceStatus, NotificationType, Priority, ProjectStatus, Role, TaskStatus, TaskType } from "@prisma/client";
import { APP_TZ } from "./time";

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Owner / Senior Management",
  AREA_MANAGER: "Area / Operations Manager",
  STORE_MANAGER: "Store Manager",
  SHIFT_LEAD: "Shift Lead",
  EMPLOYEE: "Employee",
  NEW_HIRE: "New Hire",
  COMPLIANCE: "Compliance Support",
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
    timeZone: APP_TZ,
  });
}

/** Calendar Y/M/D of a date as seen in the app timezone (Toronto). */
function tzYmd(date: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/**
 * Human "due" label relative to today, in the app timezone:
 * "3d ago" / "Yesterday" / "Today 3:00 PM" / "Tomorrow 9:00 AM" / "Wed 9:00 AM" / "Mar 5".
 * Wording is status-neutral; callers colour overdue rows themselves.
 */
export function formatDueRelative(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const a = tzYmd(new Date());
  const b = tzYmd(date);
  const diff = Math.round(
    (Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000,
  );
  const time = date.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", timeZone: APP_TZ });

  if (diff < -1) return `${Math.abs(diff)}d ago`;
  if (diff === -1) return "Yesterday";
  if (diff === 0) return `Today ${time}`;
  if (diff === 1) return `Tomorrow ${time}`;
  if (diff < 7) return `${date.toLocaleDateString("en-US", { weekday: "short", timeZone: APP_TZ })} ${time}`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TZ });
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
  COMPLIANCE_DUE_SOON: "Compliance Due Soon",
  COMPLIANCE_OVERDUE: "Compliance Overdue",
  MENTION: "Mention",
  TASK_STARTING: "Task Starting",
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
  COMPLIANCE_DUE_SOON: "text-[#F4A626]",
  COMPLIANCE_OVERDUE: "text-[#e2445c]",
  MENTION: "text-[#440E48]",
  TASK_STARTING: "text-[#5B8DD9]",
};

/** Where a notification links, based on the entity it references. */
export function notificationHref(entityType: string | null, entityId: string | null): string | null {
  switch (entityType) {
    case "Task": return entityId ? `/tasks/${entityId}` : "/tasks";
    case "MaintenanceRequest": return entityId ? `/maintenance/${entityId}` : "/maintenance";
    case "ComplianceSchedule": return entityId ? `/compliance/${entityId}` : "/compliance";
    case "Message": return "/channels";
    case "Announcement": return "/announcements";
    default: return null;
  }
}

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

// ---- Compliance / preventive-maintenance schedules ----

export const COMPLIANCE_CATEGORY_LABEL: Record<ComplianceCategory, string> = {
  PEST_CONTROL: "Pest Control",
  GREASE_TRAP: "Grease Trap",
  HOOD_CLEANING: "Hood Cleaning",
  FIRE_SAFETY: "Fire Safety",
  HVAC: "HVAC / Air-con",
  EQUIPMENT: "Equipment Service",
  SANITATION: "Sanitation",
  LICENSE_PERMIT: "License / Permit",
  OTHER: "Other",
};

// Display order follows this object's key order (the form/dropdowns read Object.keys).
export const COMPLIANCE_INTERVAL_LABEL: Record<ComplianceInterval, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Bi-weekly",
  MONTHLY: "Monthly",
  BIMONTHLY: "Every 8 weeks",
  QUARTERLY: "Quarterly",
  SEMI_ANNUAL: "Semi-annual",
  ANNUAL: "Annual",
};

// Number of months each month-based interval advances the next due date.
export const COMPLIANCE_INTERVAL_MONTHS: Record<ComplianceInterval, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMI_ANNUAL: 6,
  ANNUAL: 12,
  // Day-based intervals (see COMPLIANCE_INTERVAL_DAYS) — 0 here so any month-based
  // consumer treats them as "no month roll".
  WEEKLY: 0,
  BIWEEKLY: 0,
  BIMONTHLY: 0,
};

// Day-based intervals that don't map cleanly onto calendar months.
export const COMPLIANCE_INTERVAL_DAYS: Partial<Record<ComplianceInterval, number>> = {
  WEEKLY: 7,
  BIWEEKLY: 14,
  BIMONTHLY: 56, // 8 weeks
};

export type ComplianceStatus = "UPCOMING" | "DUE_SOON" | "OVERDUE";

export const COMPLIANCE_STATUS_LABEL: Record<ComplianceStatus, string> = {
  UPCOMING: "Upcoming",
  DUE_SOON: "Due Soon",
  OVERDUE: "Overdue",
};

export const COMPLIANCE_STATUS_HEX: Record<ComplianceStatus, string> = {
  UPCOMING: "#1DBA87",
  DUE_SOON: "#F4A626",
  OVERDUE: "#e2445c",
};

/** Advance a date by N calendar months (keeps day-of-month where possible). */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const targetMonth = d.getUTCMonth() + months;
  const result = new Date(Date.UTC(d.getUTCFullYear(), targetMonth, 1, d.getUTCHours(), d.getUTCMinutes()));
  // Clamp the day to the last day of the target month (e.g. Jan 31 + 1mo → Feb 28).
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return result;
}

/** Advance a date by N days (UTC). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function computeNextDue(lastServiceDate: Date, interval: ComplianceInterval): Date {
  const days = COMPLIANCE_INTERVAL_DAYS[interval];
  if (days) return addDays(lastServiceDate, days);
  return addMonths(lastServiceDate, COMPLIANCE_INTERVAL_MONTHS[interval]);
}

/** Whole days from the start of today (UTC) until the due date. Negative = overdue. */
export function complianceDaysUntil(nextDueDate: Date, now: Date = new Date()): number {
  const startToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const due = Date.UTC(nextDueDate.getUTCFullYear(), nextDueDate.getUTCMonth(), nextDueDate.getUTCDate());
  return Math.round((due - startToday) / 86400000);
}

export function deriveComplianceStatus(nextDueDate: Date, now: Date = new Date()): ComplianceStatus {
  const days = complianceDaysUntil(nextDueDate, now);
  if (days < 0) return "OVERDUE";
  if (days <= 7) return "DUE_SOON";
  return "UPCOMING";
}

// Re-exported from the single source of truth in ./rules.
export { isOverdue, deriveStatus } from "./rules";
