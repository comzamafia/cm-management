// Timezone helpers. The business runs in the Greater Toronto Area, so "today",
// "overdue", and checklist due times are anchored to a single local timezone
// rather than the server's UTC clock. Override with APP_TIMEZONE if needed.

export const APP_TZ = process.env.APP_TIMEZONE || "America/Toronto";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parts(date: Date, tz: string): Record<string, string> {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short",
  });
  const out: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) out[p.type] = p.value;
  return out;
}

/** Offset (ms) such that localWallClock = utc + offset, for the given instant. */
function offsetMs(date: Date, tz: string): number {
  const p = parts(date, tz);
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUTC - date.getTime();
}

/** UTC instant of local midnight (start of the local day containing `date`). */
export function startOfDayTZ(date: Date = new Date(), tz: string = APP_TZ): Date {
  const p = parts(date, tz);
  const utcGuess = Date.UTC(+p.year, +p.month - 1, +p.day, 0, 0, 0);
  const off = offsetMs(new Date(utcGuess), tz);
  return new Date(utcGuess - off);
}

/** { start, end } UTC instants bounding the local day containing `date`. */
export function dayBoundsTZ(date: Date = new Date(), tz: string = APP_TZ) {
  const start = startOfDayTZ(date, tz);
  return { start, end: new Date(start.getTime() + 86400000) };
}

/** UTC instant for a given local hour on `date`'s local day (e.g. due at 9pm Toronto). */
export function atLocalHourTZ(date: Date, hour: number, tz: string = APP_TZ): Date {
  return new Date(startOfDayTZ(date, tz).getTime() + hour * 3600000);
}

/** Local calendar date as `YYYY-MM-DD` in the configured timezone. */
export function localDateISO(date: Date = new Date(), tz: string = APP_TZ): string {
  const p = parts(date, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Local weekday (0=Sun … 6=Sat) for the instant in the configured timezone. */
export function localWeekday(date: Date = new Date(), tz: string = APP_TZ): number {
  return WD.indexOf(parts(date, tz).weekday);
}

/** Local day-of-month (1–31) in the configured timezone. */
export function localDayOfMonth(date: Date = new Date(), tz: string = APP_TZ): number {
  return +parts(date, tz).day;
}

/** Local hour (0–23) in the configured timezone. */
export function localHour(date: Date = new Date(), tz: string = APP_TZ): number {
  return +parts(date, tz).hour;
}
