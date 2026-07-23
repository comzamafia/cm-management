import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { localDateISO } from "./time";

// Auth-free core of the ops sync so both the manager "Sync" button (via the
// syncOpsData server action, which adds the auth check) and the daily cron can
// run it. Do NOT export this from a "use server" file — it must not become a
// public unauthenticated action.

const OPS_API_URL = (process.env.OPS_API_URL || "https://chiangmai-ai-operations.vercel.app").replace(/\/$/, "");

function opsHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = {};
  if (json) h["content-type"] = "application/json";
  if (process.env.OPS_API_KEY) h["authorization"] = `Bearer ${process.env.OPS_API_KEY}`;
  return h;
}

type ExtLocation = { id: number; name: string };
type ExtAi = {
  summary?: string; keywords?: string[]; severity?: string; sentiment?: string;
  sentiment_score?: number; risk_score?: number; department?: string; ai_category?: string;
  root_cause?: string; recommended_action?: string; follow_up_required?: boolean;
} | null;
type ExtPost = {
  id: number; location_id: number; date: string; created: string;
  writer_user_id: number | null; writer_name: string; writer_role: string;
  message: string; category: string; attachments: unknown[]; ai: ExtAi;
};

export type SyncResult = { ok: boolean; error?: string; fetched?: number; created?: number; updated?: number; purged?: number; from?: string; to?: string };

export async function runOpsSync(input?: { start?: string; end?: string }): Promise<SyncResult> {
  const to = input?.end ?? localDateISO();
  const from = input?.start ?? localDateISO(new Date(Date.now() - 29 * 86400000));

  // 1. Best-effort: ask the external app to refresh its logbook from 7shifts for
  //    the window. Timed out so a slow/hung external call can't stall the cron.
  try {
    await fetch(`${OPS_API_URL}/api/sync/logbook-posts`, {
      method: "POST",
      headers: opsHeaders(true),
      body: JSON.stringify({ start: from, end: to, locationId: "All" }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch { /* ignore — proceed to pull */ }

  // 2. Pull the analysed posts.
  let payload: { locations: ExtLocation[]; posts: ExtPost[] };
  try {
    const res = await fetch(
      `${OPS_API_URL}/api/dashboard?start=${from}&end=${to}&category=All&locationId=All`,
      { headers: opsHeaders(), cache: "no-store", signal: AbortSignal.timeout(30_000) },
    );
    if (!res.ok) return { ok: false, error: `Ops API returned ${res.status}` };
    payload = await res.json();
  } catch (e) {
    return { ok: false, error: `Could not reach the ops API: ${(e as Error).message}` };
  }

  const posts = Array.isArray(payload.posts) ? payload.posts : [];
  const nameById = new Map<number, string>((payload.locations ?? []).map((l) => [l.id, l.name]));
  const jsonOrNull = (v: unknown) => (v == null ? Prisma.DbNull : (v as Prisma.InputJsonValue));

  const rows = posts.map((p) => ({
    externalId: String(p.id),
    locationExtId: String(p.location_id),
    locationName: nameById.get(p.location_id) ?? String(p.location_id),
    date: p.date,
    postedAt: new Date(p.created),
    writerUserId: p.writer_user_id != null ? String(p.writer_user_id) : null,
    writerName: p.writer_name || "Unknown",
    writerRole: p.writer_role || null,
    message: p.message || "",
    category: p.category || "Uncategorized",
    attachments: (p.attachments ?? []) as Prisma.InputJsonValue,
    aiAnalyzed: !!p.ai,
    aiSummary: p.ai?.summary ?? null,
    aiKeywords: jsonOrNull(p.ai?.keywords),
    aiSeverity: p.ai?.severity ?? null,
    aiSentiment: p.ai?.sentiment ?? null,
    aiSentimentScore: p.ai?.sentiment_score ?? null,
    aiRiskScore: p.ai?.risk_score ?? null,
    aiDepartment: p.ai?.department ?? null,
    aiCategory: p.ai?.ai_category ?? null,
    aiRootCause: p.ai?.root_cause ?? null,
    aiRecommendedAction: p.ai?.recommended_action ?? null,
    aiFollowUpRequired: p.ai?.follow_up_required ?? false,
    aiRaw: jsonOrNull(p.ai),
  }));

  // 3. Insert new posts in chunks — unique externalId + skipDuplicates dedups.
  let created = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const res = await prisma.opsLogPost.createMany({ data: rows.slice(i, i + 500), skipDuplicates: true });
    created += res.count;
  }

  // 4. Refresh AI on posts stored before the external app had analysed them.
  const analyzedRows = rows.filter((r) => r.aiAnalyzed);
  let updated = 0;
  if (analyzedRows.length) {
    const stale = await prisma.opsLogPost.findMany({
      where: { externalId: { in: analyzedRows.map((r) => r.externalId) }, aiAnalyzed: false },
      select: { externalId: true },
    });
    const staleSet = new Set(stale.map((s) => s.externalId));
    for (const r of analyzedRows) {
      if (!staleSet.has(r.externalId)) continue;
      await prisma.opsLogPost.update({ where: { externalId: r.externalId }, data: r });
      updated += 1;
    }
  }

  // 5. Retention: drop anything older than the window we keep.
  const purgedRes = await prisma.opsLogPost.deleteMany({ where: { date: { lt: from } } });

  revalidatePath("/performance-overview");
  revalidatePath("/logbook");
  return { ok: true, fetched: rows.length, created, updated, purged: purgedRes.count, from, to };
}
