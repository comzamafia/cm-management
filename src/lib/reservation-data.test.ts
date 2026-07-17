import { describe, it, expect } from "vitest";
import { parseReservationCsv, computeDashboard, computeKitchenPrep, aggregateHourly } from "./reservation-data";

const HEADER = "reservedTime,telephone,customerName,numberOfGuests,assignedTables,status,source,hoursCategory,additionalRequest";

// Mirrors the real export format, including a multi-line quoted additionalRequest
// field (the actual sample file has birthday/allergy notes spanning two physical
// CSV lines) and a quoted comma-list assignedTables field.
const SAMPLE_CSV = [
  HEADER,
  '07/02/2026 16:00:00,6479362535,Samir Harb,4,,CANCELLED,Web,Dinner,',
  '07/02/2026 16:00:00,4162707809,Rebecca ,5,"29,34",SMS_CONFIRM,Web,Dinner,',
  '07/02/2026 17:30:00,6474671075,Tavea,10,"15,38,39,40",WAITING,Store,Dinner,"7a, 3k, birthday, aware of cake fees\nabbey cf khim"',
  '07/02/2026 17:30:00,6476086921,Alina,8,"4,7",WAITING,Store,Dinner,"1 kid 7 adults \nbirthday"',
  '07/02/2026 19:00:00,6476464920,Nishita Bansal,5,0,WAITING,Web,Dinner,',
  '07/02/2026 19:30:00,4164532443,Richa,4,16,WAITING,Store,Dinner,"if she doesn\'t put card info that means not confirmed "',
].join("\n");

describe("parseReservationCsv", () => {
  it("parses all data rows, including multi-line quoted fields, without corruption", () => {
    const { rows, businessDate, errors } = parseReservationCsv(SAMPLE_CSV);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(6);
    expect(businessDate).toBe("2026-07-02");

    const tavea = rows.find((r) => r.customerName === "Tavea");
    expect(tavea?.additionalRequest).toBe("7a, 3k, birthday, aware of cake fees\nabbey cf khim");
    expect(tavea?.assignedTables).toBe("15,38,39,40");
    expect(tavea?.numberOfGuests).toBe(10);
  });

  it("parses reservedTime as the wall-clock value (no server-TZ drift)", () => {
    const { rows } = parseReservationCsv(SAMPLE_CSV);
    const samir = rows.find((r) => r.customerName === "Samir Harb")!;
    expect(samir.reservedAt.getUTCHours()).toBe(16);
    expect(samir.reservedAt.getUTCMinutes()).toBe(0);
  });

  it("flags missing required columns instead of silently returning nothing", () => {
    const { rows, errors } = parseReservationCsv("a,b,c\n1,2,3");
    expect(rows).toEqual([]);
    expect(errors[0]).toMatch(/Missing expected column/);
  });
});

describe("computeDashboard", () => {
  const { rows } = parseReservationCsv(SAMPLE_CSV);
  const dashboard = computeDashboard(rows);

  it("excludes cancelled reservations from active counts", () => {
    expect(dashboard.snapshot.cancelledCount).toBe(1);
    expect(dashboard.snapshot.totalActiveReservations).toBe(5);
  });

  it("sums covers only across active reservations", () => {
    // 5 (Rebecca) + 10 (Tavea) + 8 (Alina) + 5 (Nishita) + 4 (Richa) = 32
    expect(dashboard.snapshot.totalCovers).toBe(32);
  });

  it("flags large parties at 6+ guests", () => {
    expect(dashboard.snapshot.largePartyCount).toBe(2); // Tavea (10), Alina (8)
    expect(dashboard.largeParties.map((p) => p.name)).toEqual(["Tavea", "Alina"]);
  });

  it("detects birthday mentions case-insensitively across multi-line notes", () => {
    expect(dashboard.snapshot.birthdayCount).toBe(2);
  });

  it("flags blank or '0' assignedTables as missing", () => {
    // Samir is cancelled (excluded), so only Nishita's "0" counts as missing among active rows
    expect(dashboard.snapshot.missingTableCount).toBe(1);
    expect(dashboard.tableIssues.some((t) => t.issue === "Missing Table Assignment" && t.action.includes("Nishita"))).toBe(true);
  });

  it("flags reservations with uncertain guest-count language", () => {
    expect(dashboard.tableIssues.some((t) => t.issue === "Possible Guest Count Change" && t.action.includes("Richa"))).toBe(true);
  });

  it("identifies the peak half-hour bucket by covers", () => {
    // 5:30 PM bucket (Tavea 10 + Alina 8 = 18 covers) is the heaviest
    expect(dashboard.peak?.timeLabel).toBe("5:30 PM");
    expect(dashboard.peak?.covers).toBe(18);
  });

  it("marks the last bucket of the night as LATE RUSH when it has covers", () => {
    const last = dashboard.hourly[dashboard.hourly.length - 1];
    expect(last.rushLevel).toBe("LATE RUSH");
  });

  it("produces non-empty templated action items and communication plan", () => {
    expect(dashboard.actionItems.length).toBeGreaterThan(0);
    expect(dashboard.communicationPlan.length).toBeGreaterThan(0);
    expect(dashboard.actionItems.some((p) => p.bullets.some((b) => b.includes("2 large parties")))).toBe(true);
  });

  it("defaults floorZones to empty when no zone mapping is supplied", () => {
    expect(dashboard.floorZones).toEqual([]);
  });
});

describe("computeDashboard floor zones", () => {
  const { rows } = parseReservationCsv(SAMPLE_CSV);
  const zones = [
    { name: "Zone A", tableIds: ["29", "34"] }, // Rebecca's table
    { name: "Zone B", tableIds: ["15", "38", "39", "40"] }, // Tavea's tables
    { name: "Empty Zone", tableIds: ["99"] }, // nothing assigned here
  ];
  const dashboard = computeDashboard(rows, zones);

  it("matches reservations to a zone by any overlapping assigned table", () => {
    const zoneA = dashboard.floorZones.find((z) => z.name === "Zone A")!;
    expect(zoneA.reservationCount).toBe(1);
    expect(zoneA.covers).toBe(5); // Rebecca, 5 guests

    const zoneB = dashboard.floorZones.find((z) => z.name === "Zone B")!;
    expect(zoneB.reservationCount).toBe(1);
    expect(zoneB.covers).toBe(10); // Tavea, 10 guests
  });

  it("reports LIGHT pressure for a zone with zero matching reservations", () => {
    const empty = dashboard.floorZones.find((z) => z.name === "Empty Zone")!;
    expect(empty.reservationCount).toBe(0);
    expect(empty.pressureLevel).toBe("LIGHT");
  });

  it("scales pressure level with reservation-to-table density", () => {
    // Zone A: 1 reservation / 2 tables = 0.5 ratio -> HEAVY
    const zoneA = dashboard.floorZones.find((z) => z.name === "Zone A")!;
    expect(zoneA.pressureLevel).toBe("HEAVY");
    // Zone B: 1 reservation / 4 tables = 0.25 ratio -> MODERATE
    const zoneB = dashboard.floorZones.find((z) => z.name === "Zone B")!;
    expect(zoneB.pressureLevel).toBe("MODERATE");
  });
});

describe("computeKitchenPrep", () => {
  const { rows } = parseReservationCsv(SAMPLE_CSV);
  const dashboard = computeDashboard(rows);
  const prep = computeKitchenPrep(dashboard);

  it("keeps the Hourly Overview at the dashboard's 30-minute granularity", () => {
    // Half-hour buckets: 4:00 PM (Rebecca 5), 5:30 PM (Tavea 10 + Alina 8 = 18),
    // 7:00 PM (Nishita 5), 7:30 PM (Richa 4).
    expect(prep.hourly.map((h) => h.timeLabel)).toEqual(["4:00 PM", "5:30 PM", "7:00 PM", "7:30 PM"]);
    expect(prep.hourly.map((h) => h.covers)).toEqual([5, 18, 5, 4]);
  });

  it("rolls the timeline windows up to the hour, without merging across a gap hour", () => {
    // Hourly roll-up: 4:00 STEADY(quiet), 5:00 FULL RUSH(busy), 7:00 LATE RUSH(busy)
    // — the two busy hours are not adjacent (6:00 PM has no covers), so they stay
    // separate windows even though the Overview table stays at 30-minute rows.
    expect(prep.windows.map((w) => w.band)).toEqual(["QUIET", "BUSY", "BUSY"]);
    expect(prep.windows[1]).toMatchObject({ startLabel: "5:00 PM", endLabel: "6:00 PM", totalCovers: 18, totalReservations: 2 });
  });

  it("surfaces the busiest half-hour slot for the standby callout", () => {
    expect(prep.peakLabel).toBe("5:30 PM");
    expect(prep.peakCovers).toBe(18);
  });

  it("flags every large party as a kitchen prep alert, tagging birthdays", () => {
    expect(prep.largePartyAlerts).toHaveLength(2);
    expect(prep.largePartyAlerts.every((a) => a.note.includes("birthday"))).toBe(true);
  });

  it("lists quiet windows as suggested staff-break slots in the summary", () => {
    expect(prep.summary.some((line) => line.includes("break") && line.includes("4:00 PM"))).toBe(true);
  });
});

describe("aggregateHourly", () => {
  it("sums covers/reservations per hour and re-derives a rush level", () => {
    const { rows } = parseReservationCsv(SAMPLE_CSV);
    const hourly = aggregateHourly(computeDashboard(rows).hourly);
    expect(hourly).toHaveLength(3);
    const five = hourly.find((h) => h.timeLabel === "5:00 PM")!;
    expect(five.covers).toBe(18);
    expect(five.reservations).toBe(2);
    expect(five.rushLevel).toBe("FULL RUSH");
    // The last hour of the night with covers is always the LATE RUSH closer.
    expect(hourly[hourly.length - 1].rushLevel).toBe("LATE RUSH");
  });
});
