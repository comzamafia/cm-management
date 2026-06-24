import { describe, it, expect } from "vitest";
import {
  keys, weeklyStats, monthlyStats, overall, WEEKLY_TASKS, MONTHLY_TASKS,
  type Entries,
} from "./action-plan-data";

// A Wednesday, mid-month, so day-of-month deadlines for early-month tasks have passed.
const WED = new Date(2026, 5, 17); // 2026-06-17 (local)

describe("action plan stats", () => {
  it("weeklyStats counts done and overdue relative to the weekday", () => {
    const t = WEEKLY_TASKS.find((x) => x.id === "w1")!; // Mon–Fri
    const entries: Entries = { [keys.weekly("w1", 1)]: "1" }; // Mon done
    const s = weeklyStats(t, entries, WED);
    expect(s.due).toBe(5);
    expect(s.done).toBe(1);
    // Tue + Wed are <= today (Wed) and not done → overdue; Thu/Fri still open.
    expect(s.overdue).toBe(2);
  });

  it("monthlyStats 'all' mode is a single combined check", () => {
    const t = MONTHLY_TASKS.find((x) => x.id === "m1")!; // all-mode, dueDay 2
    // On the due day, deadline == today → an unchecked item is overdue.
    const onDue = new Date(2026, 5, 2); // 2026-06-02
    expect(monthlyStats(t, {}, onDue)).toMatchObject({ due: 1, done: 0, overdue: 1 });
    expect(monthlyStats(t, { [keys.monthlyAll("m1")]: "1" }, onDue)).toMatchObject({ due: 1, done: 1, overdue: 0 });
  });

  it("monthlyStats 'grid' mode counts per applicable location", () => {
    const t = MONTHLY_TASKS.find((x) => x.id === "m2")!; // Junction/SQ1/YM, dueDay 3
    const entries: Entries = { [keys.monthlyGrid("m2", "Junction")]: "1" };
    const s = monthlyStats(t, entries, WED);
    expect(s.due).toBe(3);
    expect(s.done).toBe(1);
  });

  it("overall rolls weekly + monthly into a single percentage", () => {
    const o = overall({}, WED);
    expect(o.total).toBeGreaterThan(0);
    expect(o.done).toBe(0);
    expect(o.pct).toBe(0);
    expect(o.categories["Vendor Payment"].due).toBeGreaterThan(0);
  });
});
