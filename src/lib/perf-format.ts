// Shared number/text formatting for the Server Performance report — used by both
// the on-screen report (PerformanceReport.tsx) and the generated PDF so the two
// always match.

import type { BohWeights } from "./boh-api";

const BRANCH_TZ = "America/Toronto";

export function money0(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
export function money2(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
// Percent with up to 2 decimals, trailing zeros trimmed: 15.21% · 18.2% · 0%.
export function pct(n: number): string {
  return `${parseFloat(n.toFixed(2))}%`;
}
export function int(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
export function fmtGenerated(iso: string): string {
  const s = new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: BRANCH_TZ,
  });
  return s.replace(/\bAM\b/, "a.m.").replace(/\bPM\b/, "p.m.");
}
export function scoreFormula(w: BohWeights): string {
  const p = (x: number) => Math.round(x * 100);
  return `Score = Sales/hr ${p(w.salesPerHour)}% · Avg/Guest ${p(w.avgPerGuest)}% · Drink% ${p(w.drinkPct)}% · Dessert attach ${p(w.dessertPer100)}% · Discount discipline ${p(w.discount)}% (normalised across servers). Station logins excluded; tips not shown.`;
}
