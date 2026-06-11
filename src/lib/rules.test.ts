import { describe, it, expect } from "vitest";
import { Role, TaskStatus } from "@prisma/client";
import {
  rankOf,
  atLeast,
  isManager,
  hasGlobalScope,
  scopedLocationIdsFor,
  isLocationInScope,
  TRANSITIONS,
  canTransition,
  canVerify,
  deriveStatus,
  isOverdue,
  proofMissing,
} from "./rules";

// ── Role ranking ─────────────────────────────────────────────────────────────

describe("role ranking", () => {
  it("orders roles from NEW_HIRE (lowest) to OWNER (highest)", () => {
    expect(rankOf("NEW_HIRE")).toBeLessThan(rankOf("EMPLOYEE"));
    expect(rankOf("EMPLOYEE")).toBeLessThan(rankOf("SHIFT_LEAD"));
    expect(rankOf("SHIFT_LEAD")).toBeLessThan(rankOf("STORE_MANAGER"));
    expect(rankOf("STORE_MANAGER")).toBeLessThan(rankOf("AREA_MANAGER"));
    expect(rankOf("AREA_MANAGER")).toBeLessThan(rankOf("OWNER"));
  });

  it("atLeast is inclusive of the threshold role", () => {
    expect(atLeast("STORE_MANAGER", "STORE_MANAGER")).toBe(true);
    expect(atLeast("OWNER", "STORE_MANAGER")).toBe(true);
    expect(atLeast("SHIFT_LEAD", "STORE_MANAGER")).toBe(false);
    expect(atLeast("EMPLOYEE", "OWNER")).toBe(false);
  });

  it("isManager == STORE_MANAGER and above", () => {
    expect(isManager("STORE_MANAGER")).toBe(true);
    expect(isManager("AREA_MANAGER")).toBe(true);
    expect(isManager("OWNER")).toBe(true);
    expect(isManager("SHIFT_LEAD")).toBe(false);
    expect(isManager("EMPLOYEE")).toBe(false);
    expect(isManager("NEW_HIRE")).toBe(false);
  });
});

// ── Location scope ───────────────────────────────────────────────────────────

describe("location scope", () => {
  it("OWNER and AREA_MANAGER have global (unrestricted) scope", () => {
    expect(hasGlobalScope("OWNER")).toBe(true);
    expect(hasGlobalScope("AREA_MANAGER")).toBe(true);
    expect(hasGlobalScope("STORE_MANAGER")).toBe(false);
    expect(scopedLocationIdsFor({ role: "OWNER", locationId: "loc1" })).toBeNull();
    expect(scopedLocationIdsFor({ role: "AREA_MANAGER", locationId: null })).toBeNull();
  });

  it("store-scoped roles are limited to their own location", () => {
    expect(scopedLocationIdsFor({ role: "STORE_MANAGER", locationId: "loc1" })).toEqual(["loc1"]);
    expect(scopedLocationIdsFor({ role: "EMPLOYEE", locationId: "loc2" })).toEqual(["loc2"]);
  });

  it("a store-scoped user with no location can act on nothing", () => {
    expect(scopedLocationIdsFor({ role: "EMPLOYEE", locationId: null })).toEqual([]);
  });

  it("isLocationInScope enforces the boundary", () => {
    const employee = { role: "EMPLOYEE" as Role, locationId: "loc1" };
    expect(isLocationInScope(employee, "loc1")).toBe(true);
    expect(isLocationInScope(employee, "loc2")).toBe(false);

    const owner = { role: "OWNER" as Role, locationId: "loc1" };
    expect(isLocationInScope(owner, "loc2")).toBe(true); // global scope
  });
});

// ── Status transitions ───────────────────────────────────────────────────────

describe("status transitions", () => {
  it("allows the documented happy path", () => {
    expect(canTransition("PENDING", "IN_PROGRESS")).toBe(true);
    expect(canTransition("IN_PROGRESS", "DONE")).toBe(true);
    expect(canTransition("DONE", "VERIFIED")).toBe(true);
  });

  it("allows reopening DONE and pausing IN_PROGRESS", () => {
    expect(canTransition("DONE", "IN_PROGRESS")).toBe(true);
    expect(canTransition("IN_PROGRESS", "PENDING")).toBe(true);
  });

  it("VERIFIED is terminal", () => {
    expect(TRANSITIONS.VERIFIED).toEqual([]);
    expect(canTransition("VERIFIED", "IN_PROGRESS")).toBe(false);
    expect(canTransition("VERIFIED", "DONE")).toBe(false);
  });

  it("rejects illegal jumps", () => {
    expect(canTransition("PENDING", "VERIFIED")).toBe(false);
    expect(canTransition("PENDING", "OVERDUE")).toBe(false); // OVERDUE is derived, never a target
    expect(canTransition("IN_PROGRESS", "VERIFIED")).toBe(false);
  });

  it("an OVERDUE task can still be started or completed", () => {
    expect(canTransition("OVERDUE", "IN_PROGRESS")).toBe(true);
    expect(canTransition("OVERDUE", "DONE")).toBe(true);
    expect(canTransition("OVERDUE", "VERIFIED")).toBe(false);
  });
});

describe("verify permission", () => {
  it("only STORE_MANAGER+ can verify", () => {
    expect(canVerify("STORE_MANAGER")).toBe(true);
    expect(canVerify("OWNER")).toBe(true);
    expect(canVerify("SHIFT_LEAD")).toBe(false);
    expect(canVerify("EMPLOYEE")).toBe(false);
  });
});

// ── OVERDUE derivation ───────────────────────────────────────────────────────

describe("deriveStatus / isOverdue", () => {
  const now = new Date("2026-06-10T12:00:00Z");
  const past = new Date("2026-06-09T12:00:00Z");
  const future = new Date("2026-06-11T12:00:00Z");

  it("surfaces OVERDUE for past-due open tasks", () => {
    expect(deriveStatus("PENDING", past, now)).toBe("OVERDUE");
    expect(deriveStatus("IN_PROGRESS", past, now)).toBe("OVERDUE");
    expect(isOverdue(past, "PENDING", now)).toBe(true);
  });

  it("never marks DONE or VERIFIED as overdue", () => {
    expect(deriveStatus("DONE", past, now)).toBe("DONE");
    expect(deriveStatus("VERIFIED", past, now)).toBe("VERIFIED");
    expect(isOverdue(past, "DONE", now)).toBe(false);
  });

  it("future or absent due dates are not overdue", () => {
    expect(deriveStatus("PENDING", future, now)).toBe("PENDING");
    expect(deriveStatus("PENDING", null, now)).toBe("PENDING");
    expect(isOverdue(null, "PENDING", now)).toBe(false);
  });
});

// ── Proof requirement ────────────────────────────────────────────────────────

describe("photo proof requirement", () => {
  it("blocks DONE on a proof-required task with no photos", () => {
    expect(proofMissing("DONE", true, 0)).toBe(true);
  });

  it("allows DONE once at least one photo is attached", () => {
    expect(proofMissing("DONE", true, 1)).toBe(false);
  });

  it("does not block when proof is not required", () => {
    expect(proofMissing("DONE", false, 0)).toBe(false);
  });

  it("only applies to the DONE transition", () => {
    expect(proofMissing("IN_PROGRESS", true, 0)).toBe(false);
    expect(proofMissing("VERIFIED", true, 0)).toBe(false);
  });
});
