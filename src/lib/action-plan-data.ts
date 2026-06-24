// Pure compute helpers for the Area Manager Action Plan tracker.
// Task definitions now live in the DB (ActionPlanTask model); these helpers
// accept arrays so they work with whatever the DB returns.
// No Prisma, no "use server" — safe to import from client, server, and tests.

export const RESTAURANTS = ["Danforth", "IMM", "Junction", "Liberty", "Park Lawn", "SQ1", "YM"] as const;
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

export type WeeklyTask = {
  id: string;
  task: string;
  category: string;
  location: string;
  days: number[];
};

export type MonthlyTask = {
  id: string;
  task: string;
  dueDay: number;
  deadlineMode: "same" | "next_month_15";
  mode: "all" | "grid";
  applicable?: string[];
};

export type VendorItem = {
  id: string;
  name: string;
};

// ── Entry keys ────────────────────────────────────────────────────────────
export const keys = {
  weekly: (taskId: string, day: number) => `weekly:${taskId}:${day}`,
  monthlyAll: (taskId: string) => `monthly:${taskId}:all`,
  monthlyGrid: (taskId: string, loc: string) => `monthly:${taskId}:${loc}`,
  vendor: (vendorId: string, field: "reviewed" | "payDate" | "note") => `vendor:${vendorId}:${field}`,
  summary: (field: string) => `summary:${field}`,
};

export type Entries = Record<string, string>;
const truthy = (v: string | undefined) => v === "1" || v === "true";

// ── Date helpers ──────────────────────────────────────────────────────────
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

export function overall(
  weeklyTasks: WeeklyTask[],
  monthlyTasks: MonthlyTask[],
  entries: Entries,
  today: Date,
): Overall {
  let total = 0, done = 0, overdue = 0;
  const categories: Overall["categories"] = {};
  const add = (cat: string, due: number, complete: number) => {
    categories[cat] ??= { due: 0, done: 0 };
    categories[cat].due += due;
    categories[cat].done += complete;
  };
  for (const t of weeklyTasks) {
    const s = weeklyStats(t, entries, today);
    total += s.due; done += s.done; overdue += s.overdue;
    add(t.category, s.due, s.done);
  }
  for (const t of monthlyTasks) {
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

export function locationStats(
  weeklyTasks: WeeklyTask[],
  monthlyTasks: MonthlyTask[],
  entries: Entries,
  today: Date,
) {
  return RESTAURANTS.map((loc) => {
    let due = 0, done = 0;
    for (const t of weeklyTasks) {
      if (t.location !== loc) continue;
      const s = weeklyStats(t, entries, today);
      due += s.due; done += s.done;
    }
    for (const t of monthlyTasks) {
      if (t.mode === "grid" && (t.applicable ?? []).includes(loc)) {
        due++;
        if (truthy(entries[keys.monthlyGrid(t.id, loc)])) done++;
      }
    }
    return { loc, due, done, pct: due ? Math.round((done / due) * 100) : 0 };
  });
}

export function vendorsPaid(vendors: VendorItem[], entries: Entries): number {
  return vendors.filter((v) => entries[keys.vendor(v.id, "payDate")]).length;
}
