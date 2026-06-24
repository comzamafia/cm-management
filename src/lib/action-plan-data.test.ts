import { describe, it, expect } from "vitest";
import {
  keys, weeklyStats, monthlyStats, overall,
  type WeeklyTask, type MonthlyTask, type Entries,
} from "./action-plan-data";

const WED = new Date(2026, 5, 17); // 2026-06-17 (Wed)

const sampleWeekly: WeeklyTask[] = [
  { id: "w1", task: "Email", category: "Operations", location: "All", days: [1, 2, 3, 4, 5] },
];

const sampleMonthly: MonthlyTask[] = [
  { id: "m1", task: "Timesheets", dueDay: 2, deadlineMode: "same", mode: "all" },
  { id: "m2", task: "Bar Tips", dueDay: 3, deadlineMode: "same", mode: "grid", applicable: ["Junction", "SQ1", "YM"] },
];

describe("action plan stats", () => {
  it("weeklyStats counts done and overdue relative to the weekday", () => {
    const entries: Entries = { [keys.weekly("w1", 1)]: "1" };
    const s = weeklyStats(sampleWeekly[0], entries, WED);
    expect(s.due).toBe(5);
    expect(s.done).toBe(1);
    expect(s.overdue).toBe(2);
  });

  it("monthlyStats 'all' mode is a single combined check", () => {
    const onDue = new Date(2026, 5, 2);
    expect(monthlyStats(sampleMonthly[0], {}, onDue)).toMatchObject({ due: 1, done: 0, overdue: 1 });
    expect(monthlyStats(sampleMonthly[0], { [keys.monthlyAll("m1")]: "1" }, onDue)).toMatchObject({ due: 1, done: 1, overdue: 0 });
  });

  it("monthlyStats 'grid' mode counts per applicable location", () => {
    const entries: Entries = { [keys.monthlyGrid("m2", "Junction")]: "1" };
    const s = monthlyStats(sampleMonthly[1], entries, WED);
    expect(s.due).toBe(3);
    expect(s.done).toBe(1);
  });

  it("overall rolls weekly + monthly into a single percentage", () => {
    const o = overall(sampleWeekly, sampleMonthly, {}, WED);
    expect(o.total).toBeGreaterThan(0);
    expect(o.done).toBe(0);
    expect(o.pct).toBe(0);
  });
});
