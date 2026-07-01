"use server";

import { revalidatePath } from "next/cache";
import { LogCategory, LogDepartment, Role } from "@prisma/client";
import { prisma } from "./prisma";
import { getCurrentUser, atLeast, locationScopeWhere } from "./auth";
import { logActivity } from "./activity";
import { analyzeLogEntry } from "./logbook-ai";
import { dayBoundsTZ, localDateISO } from "./time";

export type ActionResult = { ok: boolean; error?: string };

const PER_PAGE = 30;

/** Locations the current user may file a log entry against / filter by. */
export async function getLogbookLocations() {
  const user = await getCurrentUser();
  if (!user) return [];
  const scope = await locationScopeWhere(user);
  return prisma.location.findMany({
    where: scope.locationId ? { id: { in: scope.locationId.in } } : {},
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// ── Create ────────────────────────────────────────────────────────────────

export type CreateLogEntryInput = {
  locationId: string;
  category: LogCategory;
  department: LogDepartment;
  body: string;
  itemTag?: string;
  photoUrls?: string[];
};

export async function createLogEntry(input: CreateLogEntryInput): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!atLeast(user.role, Role.EMPLOYEE)) return { ok: false, error: "Not permitted" };

  const body = input.body.trim();
  if (!body) return { ok: false, error: "Entry cannot be empty" };
  if (body.length > 4000) return { ok: false, error: "Entry too long (max 4000 chars)" };

  const scope = await locationScopeWhere(user);
  if (scope.locationId && !scope.locationId.in.includes(input.locationId)) {
    return { ok: false, error: "Location out of scope" };
  }

  const itemTag = input.itemTag?.trim() || null;
  const photoUrls = input.photoUrls ?? [];

  const entry = await prisma.$transaction(async (tx) => {
    const row = await tx.logEntry.create({
      data: {
        locationId: input.locationId,
        authorId: user.id,
        category: input.category,
        department: input.department,
        body,
        itemTag,
        photoUrls,
      },
    });
    await logActivity(tx, {
      userId: user.id,
      action: "logbook.entry_created",
      entity: "LogEntry",
      entityId: row.id,
      locationId: input.locationId,
      meta: { category: input.category, department: input.department, excerpt: body.slice(0, 80) },
    });
    return row;
  });

  revalidatePath("/logbook");

  // Fire-and-forget AI risk analysis — never block the response on the LLM round-trip.
  analyzeLogEntry(entry.id).catch(() => {});

  return { ok: true };
}

// ── Reads ─────────────────────────────────────────────────────────────────

export async function getTodayRollup(date?: string) {
  const user = await getCurrentUser();
  if (!user) return { day: localDateISO(), locations: [] as RollupLocation[] };

  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : localDateISO();
  const anchor = new Date(`${day}T12:00:00.000Z`);
  const { start, end } = dayBoundsTZ(anchor);
  const scope = await locationScopeWhere(user);

  const [locations, entries] = await Promise.all([
    prisma.location.findMany({
      where: scope.locationId ? { id: { in: scope.locationId.in } } : {},
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.logEntry.findMany({
      where: { createdAt: { gte: start, lt: end }, ...scope },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const rollup: RollupLocation[] = locations.map((loc) => {
    const locEntries = entries.filter((e) => e.locationId === loc.id);
    const byCategory = (cat: LogCategory) =>
      locEntries
        .filter((e) => e.category === cat)
        .map((e) => ({ id: e.id, body: e.body, authorName: e.author.name, department: e.department, itemTag: e.itemTag }));

    return {
      id: loc.id,
      name: loc.name,
      recordCount: locEntries.length,
      operations: byCategory("OPERATIONS"),
      salesMetrics: byCategory("SALES_METRICS"),
      complaints: byCategory("CUSTOMER_COMPLAINT"),
      actionNeeded: byCategory("ACTION_NEEDED"),
    };
  });

  return { day, locations: rollup };
}

export type RollupLocation = {
  id: string;
  name: string;
  recordCount: number;
  operations: RollupItem[];
  salesMetrics: RollupItem[];
  complaints: RollupItem[];
  actionNeeded: RollupItem[];
};
export type RollupItem = { id: string; body: string; authorName: string; department: LogDepartment; itemTag: string | null };

export type LogHistoryFilters = {
  locationId?: string;
  from?: string;
  to?: string;
  department?: LogDepartment;
  itemTag?: string;
  category?: LogCategory;
  page?: number;
};

export async function getLogHistory(filters: LogHistoryFilters = {}) {
  const user = await getCurrentUser();
  if (!user) return { total: 0, page: 1, totalPages: 1, entries: [] };

  const scope = await locationScopeWhere(user);
  const page = Math.max(1, filters.page ?? 1);

  const where: Record<string, unknown> = { ...scope };
  if (filters.locationId) where.locationId = filters.locationId;
  if (filters.department) where.department = filters.department;
  if (filters.category) where.category = filters.category;
  if (filters.itemTag) where.itemTag = { contains: filters.itemTag, mode: "insensitive" };
  if (filters.from || filters.to) {
    const gte = filters.from ? new Date(`${filters.from}T00:00:00.000Z`) : undefined;
    const lte = filters.to ? new Date(new Date(`${filters.to}T00:00:00.000Z`).getTime() + 86400000) : undefined;
    where.createdAt = { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
  }

  const [total, entries] = await Promise.all([
    prisma.logEntry.count({ where }),
    prisma.logEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        author: { select: { name: true } },
        location: { select: { name: true } },
      },
    }),
  ]);

  return { total, page, totalPages: Math.max(1, Math.ceil(total / PER_PAGE)), entries };
}

export async function getAttentionQueue() {
  const user = await getCurrentUser();
  if (!user) return [];
  const scope = await locationScopeWhere(user);
  return prisma.logEntry.findMany({
    where: { aiRiskLevel: "HIGH", resolvedAt: null, ...scope },
    include: { author: { select: { name: true } }, location: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAttentionQueueCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  const scope = await locationScopeWhere(user);
  return prisma.logEntry.count({ where: { aiRiskLevel: "HIGH", resolvedAt: null, ...scope } });
}

export async function getItemTagSuggestions(query: string): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user || !query.trim()) return [];
  const scope = await locationScopeWhere(user);
  const rows = await prisma.logEntry.findMany({
    where: { itemTag: { contains: query.trim(), mode: "insensitive" }, ...scope },
    distinct: ["itemTag"],
    select: { itemTag: true },
    take: 10,
  });
  return rows.map((r) => r.itemTag).filter((t): t is string => !!t);
}

export async function getKpiData() {
  const user = await getCurrentUser();
  if (!user) return { hourly: [], complaintsByDay: [], byDepartment: [], totalToday: 0 };

  const scope = await locationScopeWhere(user);
  const now = new Date();
  const { start: todayStart, end: todayEnd } = dayBoundsTZ(now);
  const sevenDaysAgo = dayBoundsTZ(new Date(now.getTime() - 6 * 86400000)).start;

  const [todayEntries, weekEntries] = await Promise.all([
    prisma.logEntry.findMany({
      where: { createdAt: { gte: todayStart, lt: todayEnd }, ...scope },
      select: { createdAt: true, department: true },
    }),
    prisma.logEntry.findMany({
      where: { createdAt: { gte: sevenDaysAgo, lt: todayEnd }, category: "CUSTOMER_COMPLAINT", ...scope },
      select: { createdAt: true },
    }),
  ]);

  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
  for (const e of todayEntries) {
    const h = new Date(e.createdAt).getUTCHours();
    hourly[h].count += 1;
  }

  const dayBuckets: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    dayBuckets[localDateISO(new Date(now.getTime() - i * 86400000))] = 0;
  }
  for (const e of weekEntries) {
    const key = localDateISO(e.createdAt);
    if (key in dayBuckets) dayBuckets[key] += 1;
  }
  const complaintsByDay = Object.entries(dayBuckets).map(([date, count]) => ({ date, count }));

  const foh = todayEntries.filter((e) => e.department === "FOH").length;
  const boh = todayEntries.filter((e) => e.department === "BOH").length;

  return {
    hourly,
    complaintsByDay,
    byDepartment: [
      { name: "FOH", value: foh },
      { name: "BOH", value: boh },
    ],
    totalToday: todayEntries.length,
  };
}

// ── Resolve ───────────────────────────────────────────────────────────────

export async function resolveAttentionItem(entryId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!atLeast(user.role, Role.STORE_MANAGER)) return { ok: false, error: "Not permitted" };

  const scope = await locationScopeWhere(user);
  const entry = await prisma.logEntry.findFirst({ where: { id: entryId, ...scope } });
  if (!entry) return { ok: false, error: "Entry not found or out of scope" };

  await prisma.$transaction(async (tx) => {
    await tx.logEntry.update({
      where: { id: entryId },
      data: { resolvedById: user.id, resolvedAt: new Date() },
    });
    await logActivity(tx, {
      userId: user.id,
      action: "logbook.entry_resolved",
      entity: "LogEntry",
      entityId: entryId,
      locationId: entry.locationId,
      meta: {},
    });
  });

  revalidatePath("/logbook");
  return { ok: true };
}
