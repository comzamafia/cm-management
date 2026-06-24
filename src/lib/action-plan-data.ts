// Static definitions + pure compute helpers for the Area Manager Action Plan
// tracker (Hang / Sujee). Ported from the provided mockup. No Prisma, no
// "use server" — safe to import from client and server, and unit-testable.

export const RESTAURANTS = ["Danforth", "IMM", "Junction", "Liberty", "Park Lawn", "SQ1", "YM"] as const;
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

export type WeeklyTask = {
  id: string;
  task: string;
  category: string;
  location: string;
  days: number[]; // 1=Mon … 5=Fri
};

export const WEEKLY_TASKS: WeeklyTask[] = [
  { id: "w1", task: "Review Email Inbox", category: "Operations", location: "All", days: [1, 2, 3, 4, 5] },
  { id: "w2", task: "Review Catering Requests", category: "Catering", location: "All", days: [1, 2, 3, 4, 5] },
  { id: "w3", task: "Review Manager Reports - All Locations", category: "Reporting", location: "All", days: [1, 2, 3, 4, 5] },
  { id: "w4", task: "Follow Up on Operational Issues Identified in Reports", category: "Operations", location: "All", days: [1, 2, 3, 4, 5] },
  { id: "w5", task: "Liberty Meeting", category: "Operations", location: "Liberty", days: [1] },
  { id: "w6", task: "Liberty Follow-Up Actions", category: "Operations", location: "Liberty", days: [2] },
  { id: "w7a", task: "BlackFox Tip Transfer", category: "Tips", location: "Liberty", days: [1] },
  { id: "w7b", task: "BlackFox Tip Transfer", category: "Tips", location: "IMM", days: [1] },
  { id: "w7c", task: "BlackFox Tip Transfer", category: "Tips", location: "Junction", days: [1] },
  { id: "w7d", task: "BlackFox Tip Transfer", category: "Tips", location: "Danforth", days: [1] },
  { id: "w7e", task: "BlackFox Tip Transfer", category: "Tips", location: "YM", days: [1] },
  { id: "w7f", task: "BlackFox Tip Transfer", category: "Tips", location: "SQ1", days: [1] },
  { id: "w8", task: "Midland Vendor Payment", category: "Vendor Payment", location: "All", days: [1, 5] },
  { id: "w9", task: "Sujee Credit/EMT Payment", category: "Vendor Payment", location: "All", days: [1] },
  { id: "w10", task: "Review Labour Hours in 7Shifts", category: "Payroll", location: "All", days: [5] },
  { id: "w11", task: "Nonna Lia Vendor Payment", category: "Vendor Payment", location: "All", days: [5] },
  { id: "w12", task: "Weekly Operational Review & Follow-Up", category: "Reporting", location: "All", days: [5] },
];

export type MonthlyTask = {
  id: string;
  task: string;
  dueDay: number;
  deadlineMode: "same" | "next_month_15";
  mode: "all" | "grid";
  applicable?: string[];
};

export const MONTHLY_TASKS: MonthlyTask[] = [
  { id: "m1", task: "Download & Review Timesheets (16th-31st)", dueDay: 2, deadlineMode: "same", mode: "all" },
  { id: "m2", task: "Run Host & Bar Tips (16th-31st)", dueDay: 3, deadlineMode: "same", mode: "grid", applicable: ["Junction", "SQ1", "YM"] },
  { id: "m3", task: "Vendor Payment — BMB", dueDay: 8, deadlineMode: "same", mode: "grid", applicable: [...RESTAURANTS] },
  { id: "m4", task: "Vendor Payment — J&S", dueDay: 8, deadlineMode: "same", mode: "grid", applicable: [...RESTAURANTS] },
  { id: "m5", task: "Vendor Payment — Kai Wei", dueDay: 8, deadlineMode: "same", mode: "grid", applicable: [...RESTAURANTS] },
  { id: "m6", task: "Vendor Payment — SongXing", dueDay: 8, deadlineMode: "same", mode: "grid", applicable: ["Park Lawn"] },
  { id: "m7", task: "Vendor Payment — Kelly", dueDay: 8, deadlineMode: "same", mode: "grid", applicable: ["YM"] },
  { id: "m8", task: "Vendor Payment — Bae Greens", dueDay: 8, deadlineMode: "same", mode: "grid", applicable: [...RESTAURANTS] },
  { id: "m9", task: "Vendor Payment — Tofu", dueDay: 8, deadlineMode: "same", mode: "grid", applicable: [...RESTAURANTS] },
  { id: "m10", task: "Vendor Payment — Everyday Micro", dueDay: 8, deadlineMode: "same", mode: "grid", applicable: [...RESTAURANTS] },
  { id: "m11", task: "Vendor Payment — Juice Concepts", dueDay: 8, deadlineMode: "same", mode: "grid", applicable: [...RESTAURANTS] },
  { id: "m12", task: "Vendor Payment — Oceans", dueDay: 8, deadlineMode: "same", mode: "grid", applicable: [...RESTAURANTS] },
  { id: "m13", task: "Remittance Payment", dueDay: 10, deadlineMode: "same", mode: "all" },
  { id: "m14", task: "Monthly Kitchen Tips Calculation", dueDay: 12, deadlineMode: "next_month_15", mode: "grid", applicable: [...RESTAURANTS] },
  { id: "m15", task: "Download & Review Timesheets (1st-15th)", dueDay: 17, deadlineMode: "same", mode: "all" },
  { id: "m16", task: "Run Host & Bar Tips (1st-15th)", dueDay: 18, deadlineMode: "same", mode: "grid", applicable: ["Junction", "SQ1", "YM"] },
].sort((a, b) => a.dueDay - b.dueDay) as MonthlyTask[];

export const VENDORS = [
  "BMB", "J&S", "Kai Wei", "SongXing (Park Lawn)", "Kelly (YM)",
  "Bae Greens", "Tofu", "Everyday Micro", "Juice Concepts", "Oceans",
];

// ── Entry keys ────────────────────────────────────────────────────────────
// A single flat map { key: value } per period drives the whole tracker.
export const keys = {
  weekly: (taskId: string, day: number) => `weekly:${taskId}:${day}`,
  monthlyAll: (taskId: string) => `monthly:${taskId}:all`,
  monthlyGrid: (taskId: string, loc: string) => `monthly:${taskId}:${loc}`,
  vendor: (vendor: string, field: "reviewed" | "payDate" | "note") => `vendor:${vendor}:${field}`,
  summary: (field: string) => `summary:${field}`,
};

export type Entries = Record<string, string>;
const truthy = (v: string | undefined) => v === "1" || v === "true";

// ── Date helpers (mirror the mockup) ────────────────────────────────────────
/** Next occurrence of day-of-month `day`, relative to `today`. */
export function nextDue(day: number, today: Date): Date {
  const d = new Date(today.getFullYear(), today.getMonth(), day);
  return today.getDate() > day ? new Date(today.getFullYear(), today.getMonth() + 1, day) : d;
}
export function deadline(task: MonthlyTask, today: Date): Date {
  const due = nextDue(task.dueDay, today);
  return task.deadlineMode === "next_month_15"
    ? new Date(due.getFullYear(), due.getMonth() + 1, 15)
    : due;
}

// ── Stats ───────────────────────────────────────────────────────────────────
/** Local weekday Mon=1 … Sun=7. */
export function weekdayOf(today: Date): number {
  const d = today.getDay();
  return d === 0 ? 7 : d;
}

export function weeklyStats(task: WeeklyTask, entries: Entries, today: Date) {
  const wd = weekdayOf(today);
  let done = 0, overdue = 0;
  for (const d of task.days) {
    if (truthy(entries[keys.weekly(task.id, d)])) done++;
    else if (d <= wd && wd <= 5) overdue++;
  }
  return { due: task.days.length, done, overdue };
}

export function monthlyStats(task: MonthlyTask, entries: Entries, today: Date) {
  const applicable = task.applicable ?? [];
  const due = task.mode === "all" ? 1 : applicable.length;
  let done = 0;
  if (task.mode === "all") {
    done = truthy(entries[keys.monthlyAll(task.id)]) ? 1 : 0;
  } else {
    for (const loc of applicable) if (truthy(entries[keys.monthlyGrid(task.id, loc)])) done++;
  }
  const overdue = today >= deadline(task, today) && done < due ? due - done : 0;
  return { due, done, overdue };
}

export type Overall = {
  total: number;
  done: number;
  overdue: number;
  pct: number;
  categories: Record<string, { due: number; done: number }>;
};

export function overall(entries: Entries, today: Date): Overall {
  let total = 0, done = 0, overdue = 0;
  const categories: Overall["categories"] = {};
  const add = (cat: string, due: number, complete: number) => {
    categories[cat] ??= { due: 0, done: 0 };
    categories[cat].due += due;
    categories[cat].done += complete;
  };
  for (const t of WEEKLY_TASKS) {
    const s = weeklyStats(t, entries, today);
    total += s.due; done += s.done; overdue += s.overdue;
    add(t.category, s.due, s.done);
  }
  for (const t of MONTHLY_TASKS) {
    const s = monthlyStats(t, entries, today);
    total += s.due; done += s.done; overdue += s.overdue;
    const cat = t.task.includes("Vendor Payment")
      ? "Vendor Payment"
      : t.task.includes("Timesheet") || t.task.includes("Remittance")
        ? "Payroll"
        : "Tips";
    add(cat, s.due, s.done);
  }
  return { total, done, overdue, pct: total ? Math.round((done / total) * 100) : 0, categories };
}

/** Per-location completion (weekly location-specific + monthly grid items). */
export function locationStats(entries: Entries, today: Date) {
  return RESTAURANTS.map((loc) => {
    let due = 0, done = 0;
    for (const t of WEEKLY_TASKS) {
      if (t.location !== loc) continue;
      const s = weeklyStats(t, entries, today);
      due += s.due; done += s.done;
    }
    for (const t of MONTHLY_TASKS) {
      if (t.mode === "grid" && (t.applicable ?? []).includes(loc)) {
        due++;
        if (truthy(entries[keys.monthlyGrid(t.id, loc)])) done++;
      }
    }
    return { loc, due, done, pct: due ? Math.round((done / due) * 100) : 0 };
  });
}

export function vendorsPaid(entries: Entries): number {
  return VENDORS.filter((v) => entries[keys.vendor(v, "payDate")]).length;
}
