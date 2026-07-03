// Pure CSV parsing + dashboard computation for the daily reservation-book upload.
// No Prisma, no "use server" — fully unit-testable (see reservation-data.test.ts).
import Papa from "papaparse";

export type ReservationRow = {
  recordId?: string; // set once loaded from the DB (absent during fresh CSV parsing)
  reservedAt: Date; // constructed via Date.UTC from the CSV's own wall-clock values —
                     // always read back with getUTC*() so it never drifts with server TZ
  telephone: string;
  customerName: string;
  numberOfGuests: number;
  assignedTables: string; // raw CSV value — reference/display only, never used for zone matching
  tableAssignment: string; // host-entered value — this is what missing-table checks and the
                            // Floor Pressure Map actually read; "" until a host assigns it
  status: string;
  source: string;
  hoursCategory: string;
  additionalRequest: string;
};

export type ParseResult = {
  rows: ReservationRow[];
  businessDate: string; // "YYYY-MM-DD"
  errors: string[];
};

const REQUIRED_COLUMNS = [
  "reservedTime",
  "telephone",
  "customerName",
  "numberOfGuests",
  "assignedTables",
  "status",
  "source",
  "hoursCategory",
  "additionalRequest",
];

const DATETIME_RE = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/;

function parseReservedTime(value: string): Date | null {
  const m = DATETIME_RE.exec(value.trim());
  if (!m) return null;
  const [, month, day, year, hour, min, sec] = m;
  return new Date(Date.UTC(+year, +month - 1, +day, +hour, +min, +sec));
}

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Parses a raw reservation-export CSV. Handles quoted multi-line fields (real
 * exports have birthday/allergy notes spanning multiple physical lines). */
export function parseReservationCsv(csvText: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const fields = parsed.meta.fields ?? [];
  const missing = REQUIRED_COLUMNS.filter((c) => !fields.includes(c));
  if (missing.length > 0) {
    return { rows: [], businessDate: "", errors: [`Missing expected column(s): ${missing.join(", ")}. Is this the right export?`] };
  }

  const rows: ReservationRow[] = [];
  const errors: string[] = [];
  const dateCounts: Record<string, number> = {};

  for (const raw of parsed.data) {
    const reservedAt = parseReservedTime(raw.reservedTime ?? "");
    if (!reservedAt) {
      errors.push(`Skipped row with unparseable reservedTime: "${raw.reservedTime}"`);
      continue;
    }
    const guests = parseInt(raw.numberOfGuests ?? "0", 10);
    const row: ReservationRow = {
      reservedAt,
      telephone: (raw.telephone ?? "").trim(),
      customerName: (raw.customerName ?? "").trim(),
      numberOfGuests: Number.isFinite(guests) ? guests : 0,
      assignedTables: (raw.assignedTables ?? "").trim(),
      tableAssignment: "", // never auto-filled from the CSV — host assigns it after import
      status: (raw.status ?? "").trim(),
      source: (raw.source ?? "").trim(),
      hoursCategory: (raw.hoursCategory ?? "").trim(),
      additionalRequest: (raw.additionalRequest ?? "").trim(),
    };
    rows.push(row);
    const key = ymd(reservedAt);
    dateCounts[key] = (dateCounts[key] ?? 0) + 1;
  }

  const businessDate = Object.entries(dateCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  return { rows, businessDate, errors };
}

// ── Dashboard computation ──────────────────────────────────────────────────

export type RushLevel = "FULL RUSH" | "HIGH PRESSURE" | "MODERATE" | "STEADY" | "LATE RUSH";

export type HourlyBucket = {
  bucketMinutes: number; // minutes since midnight, for sorting/labeling
  timeLabel: string; // "4:00 PM"
  reservations: number;
  covers: number;
  rushLevel: RushLevel;
};

export type SnapshotStats = {
  totalActiveReservations: number;
  totalCovers: number;
  largePartyCount: number;
  birthdayCount: number;
  missingTableCount: number;
  cancelledCount: number;
};

export type LargeParty = {
  recordId?: string;
  timeLabel: string;
  name: string;
  guests: number;
  notes: string;
  tableAssignment: string;
};

export type TableIssue = {
  recordId?: string;
  issue: string;
  action: string;
};

export type FloorZoneInput = { name: string; tableIds: string[] };

export type PressureLevel = "LIGHT" | "MODERATE" | "HEAVY" | "CRITICAL";

export type FloorZoneStat = {
  name: string;
  tableCount: number;
  reservationCount: number;
  covers: number;
  pressureLevel: PressureLevel;
};

export type ActiveReservationRow = {
  recordId?: string;
  timeLabel: string;
  name: string;
  guests: number;
  tableAssignment: string;
  csvTableRef: string; // CSV's assignedTables value, shown as an unverified reference only
};

export type Dashboard = {
  hourly: HourlyBucket[];
  peak: HourlyBucket | null;
  snapshot: SnapshotStats;
  largeParties: LargeParty[];
  tableIssues: TableIssue[];
  actionItems: { phase: string; bullets: string[] }[];
  communicationPlan: { phase: string; bullets: string[] }[];
  quickNotes: string[];
  floorZones: FloorZoneStat[];
  activeReservations: ActiveReservationRow[];
};

const LARGE_PARTY_MIN = 6;
const GUEST_CHANGE_KEYWORDS = [
  "may change",
  "not confirmed",
  "if she doesn't",
  "if he doesn't",
  "card info",
  "unconfirmed",
  "guest count may",
];

function bucketMinutes(d: Date): number {
  const half = d.getUTCMinutes() < 30 ? 0 : 30;
  return d.getUTCHours() * 60 + half;
}

function formatTimeLabel(totalMinutes: number): string {
  const h24 = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function isMissingTable(tableAssignment: string): boolean {
  const t = tableAssignment.trim();
  return t === "" || t === "0";
}

function isLargeParty(guests: number): boolean {
  return guests >= LARGE_PARTY_MIN;
}

function isBirthday(note: string): boolean {
  return /birthday/i.test(note);
}

function mentionsGuestCountChange(note: string): boolean {
  const lower = note.toLowerCase();
  return GUEST_CHANGE_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Splits a raw "15,38,39,40" assignedTables string into individual table ids. */
function splitTableIds(assignedTables: string): string[] {
  return assignedTables
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t !== "" && t !== "0");
}

/**
 * Occupancy-density heuristic — reservations touching a zone relative to how
 * many tables it has. Documented/tunable, same spirit as the rush-level
 * thresholds: not meant to be an exact science, just a reasonable at-a-glance
 * signal that's easy to retune per zone size.
 */
function pressureLevelFor(reservationCount: number, tableCount: number): PressureLevel {
  if (tableCount === 0) return "LIGHT";
  const ratio = reservationCount / tableCount;
  if (ratio >= 0.8) return "CRITICAL";
  if (ratio >= 0.5) return "HEAVY";
  if (ratio >= 0.25) return "MODERATE";
  return "LIGHT";
}

function computeFloorZones(active: ReservationRow[], zones: FloorZoneInput[]): FloorZoneStat[] {
  return zones.map((zone) => {
    const tableIdSet = new Set(zone.tableIds);
    const matching = active.filter((r) => splitTableIds(r.tableAssignment).some((t) => tableIdSet.has(t)));
    return {
      name: zone.name,
      tableCount: zone.tableIds.length,
      reservationCount: matching.length,
      covers: matching.reduce((s, r) => s + r.numberOfGuests, 0),
      pressureLevel: pressureLevelFor(matching.length, zone.tableIds.length),
    };
  });
}

export function computeDashboard(rows: ReservationRow[], zones: FloorZoneInput[] = []): Dashboard {
  const active = rows.filter((r) => r.status !== "CANCELLED");
  const cancelled = rows.filter((r) => r.status === "CANCELLED");

  // ── Hourly buckets ──
  const bucketMap = new Map<number, { reservations: number; covers: number }>();
  for (const r of active) {
    const b = bucketMinutes(r.reservedAt);
    const cur = bucketMap.get(b) ?? { reservations: 0, covers: 0 };
    cur.reservations += 1;
    cur.covers += r.numberOfGuests;
    bucketMap.set(b, cur);
  }
  const sortedBuckets = [...bucketMap.entries()].sort((a, b) => a[0] - b[0]);
  const coverValues = sortedBuckets.map(([, v]) => v.covers);
  const avgCovers = coverValues.length > 0 ? coverValues.reduce((s, v) => s + v, 0) / coverValues.length : 0;
  const lastBucketMinutes = sortedBuckets.length > 0 ? sortedBuckets[sortedBuckets.length - 1][0] : null;

  // Rush-level thresholds are relative to the night's own average covers per
  // half-hour slot — a simple, documented heuristic (not meant to exactly
  // reproduce hand-annotated labels, just a reasonable approximation that's
  // easy to retune in one place if it doesn't match how a given night felt).
  function rushLevelFor(bucket: number, covers: number): RushLevel {
    if (bucket === lastBucketMinutes && covers > 0) return "LATE RUSH";
    if (avgCovers === 0) return "STEADY";
    if (covers >= avgCovers * 1.3) return "FULL RUSH";
    if (covers >= avgCovers * 1.0) return "HIGH PRESSURE";
    if (covers >= avgCovers * 0.6) return "MODERATE";
    return "STEADY";
  }

  const hourly: HourlyBucket[] = sortedBuckets.map(([bucket, v]) => ({
    bucketMinutes: bucket,
    timeLabel: formatTimeLabel(bucket),
    reservations: v.reservations,
    covers: v.covers,
    rushLevel: rushLevelFor(bucket, v.covers),
  }));

  const peak = hourly.reduce<HourlyBucket | null>(
    (best, b) => (best === null || b.covers > best.covers ? b : best),
    null,
  );

  // ── Snapshot ──
  const snapshot: SnapshotStats = {
    totalActiveReservations: active.length,
    totalCovers: active.reduce((s, r) => s + r.numberOfGuests, 0),
    largePartyCount: active.filter((r) => isLargeParty(r.numberOfGuests)).length,
    birthdayCount: active.filter((r) => isBirthday(r.additionalRequest)).length,
    missingTableCount: active.filter((r) => isMissingTable(r.tableAssignment)).length,
    cancelledCount: cancelled.length,
  };

  // ── Large party tracker ──
  const largeParties: LargeParty[] = active
    .filter((r) => isLargeParty(r.numberOfGuests))
    .sort((a, b) => a.reservedAt.getTime() - b.reservedAt.getTime())
    .map((r) => ({
      recordId: r.recordId,
      timeLabel: formatTimeLabel(r.reservedAt.getUTCHours() * 60 + r.reservedAt.getUTCMinutes()),
      name: r.customerName,
      guests: r.numberOfGuests,
      notes: r.additionalRequest,
      tableAssignment: r.tableAssignment,
    }));

  // ── Table issues ──
  const tableIssues: TableIssue[] = [
    ...active
      .filter((r) => isMissingTable(r.tableAssignment))
      .map((r) => ({
        recordId: r.recordId,
        issue: "Missing Table Assignment",
        action: `${r.customerName} – ${formatTimeLabel(r.reservedAt.getUTCHours() * 60 + r.reservedAt.getUTCMinutes())} Party of ${r.numberOfGuests}`,
      })),
    ...active
      .filter((r) => mentionsGuestCountChange(r.additionalRequest))
      .map((r) => ({
        recordId: r.recordId,
        issue: "Possible Guest Count Change",
        action: `${r.customerName} reservation at ${formatTimeLabel(r.reservedAt.getUTCHours() * 60 + r.reservedAt.getUTCMinutes())}`,
      })),
  ];

  // ── Host Action Items (fixed template, real values interpolated) ──
  const actionItems = [
    {
      phase: peak ? `${peak.timeLabel} RUSH` : "Rush Prep",
      bullets: [
        peak ? `Front door fully staffed by ${formatTimeLabel(peak.bucketMinutes - 15)}` : "Confirm front door staffing before the first wave",
        "Kitchen warning before the peak seating push",
        snapshot.largePartyCount > 1 ? "Avoid seating all large tables simultaneously" : "Stagger large-party seating where possible",
        "Monitor coupon guests / slower-turn tables",
      ],
    },
    {
      phase: "Peak Coordination",
      bullets: [
        snapshot.largePartyCount > 0 ? `${snapshot.largePartyCount} large part${snapshot.largePartyCount === 1 ? "y" : "ies"} (6+ guests) tonight — pre-stage sections` : "No large parties flagged tonight",
        snapshot.birthdayCount > 0 ? `${snapshot.birthdayCount} birthday table${snapshot.birthdayCount === 1 ? "" : "s"} — coordinate cake/candle timing` : "No birthday tables flagged tonight",
        "Ensure runners & support staff ready for the peak window",
      ],
    },
    {
      phase: "After Peak",
      bullets: [
        "Reset sections aggressively",
        lastBucketMinutes !== null ? `Prepare for the ${formatTimeLabel(lastBucketMinutes)} late rush` : "Prepare for late seating",
        "Monitor lingering large tables",
      ],
    },
  ];

  // ── Host Communication Plan (fixed 3-phase template) ──
  const beforeLabel = peak ? formatTimeLabel(peak.bucketMinutes - 30) : "the first rush";
  const communicationPlan = [
    {
      phase: `BEFORE ${beforeLabel}`,
      bullets: [
        "Confirm all table resets",
        "Double-check reservations without tables assigned",
        `Notify kitchen about the ${snapshot.totalCovers}-cover projected night`,
      ],
    },
    {
      phase: peak ? `DURING ${peak.timeLabel}` : "DURING PEAK",
      bullets: [
        "Hold walk-ins temporarily if kitchen slows",
        "Stagger seating every 5–10 minutes",
        "Prioritize large-party pacing",
      ],
    },
    {
      phase: lastBucketMinutes !== null ? `AFTER ${formatTimeLabel(lastBucketMinutes)}` : "AFTER PEAK",
      bullets: [
        "Reset sections aggressively",
        "Prepare for the late rush",
        "Monitor lingering large tables",
      ],
    },
  ];

  // ── Quick notes ──
  const quickNotes: string[] = [];
  if (peak) quickNotes.push(`${peak.timeLabel} is the heaviest seating wave of the night (${peak.covers} covers)`);
  quickNotes.push(`Total projected covers: ${snapshot.totalCovers}`);
  if (snapshot.birthdayCount > 0) quickNotes.push(`${snapshot.birthdayCount} birthday/celebration table${snapshot.birthdayCount === 1 ? "" : "s"}`);
  if (snapshot.largePartyCount > 0) quickNotes.push(`${snapshot.largePartyCount} large part${snapshot.largePartyCount === 1 ? "y" : "ies"} could impact kitchen pacing`);
  if (snapshot.cancelledCount > 0) quickNotes.push(`${snapshot.cancelledCount} cancellation${snapshot.cancelledCount === 1 ? "" : "s"} tonight`);
  if (lastBucketMinutes !== null) quickNotes.push(`Late-night traffic through ${formatTimeLabel(lastBucketMinutes)}`);

  const floorZones = computeFloorZones(active, zones);

  const activeReservations: ActiveReservationRow[] = [...active]
    .sort((a, b) => a.reservedAt.getTime() - b.reservedAt.getTime())
    .map((r) => ({
      recordId: r.recordId,
      timeLabel: formatTimeLabel(r.reservedAt.getUTCHours() * 60 + r.reservedAt.getUTCMinutes()),
      name: r.customerName,
      guests: r.numberOfGuests,
      tableAssignment: r.tableAssignment,
      csvTableRef: r.assignedTables,
    }));

  return { hourly, peak, snapshot, largeParties, tableIssues, actionItems, communicationPlan, quickNotes, floorZones, activeReservations };
}
