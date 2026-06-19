// Server-only module: reads API keys from process.env. Only import from server
// components / route handlers, never from a "use client" file.
import { BOH_BRANCHES, getBranch, type BohBranch } from "./boh-branches";

// ── Response types (mirror docs/PUBLIC-API.md exactly) ──────────────────────────

export type BohServer = {
  name: string;
  isStation: boolean;
  score: number;
  shifts: number;
  hours: number;
  netSales: number;
  grossSales: number;
  discount: number;
  discountPct: number;
  tips: number;
  tipPct: number;
  guests: number;
  orders: number;
  salesPerHour: number;
  avgPerGuest: number;
  avgPerOrder: number;
  foodSales: number;
  beverageSales: number;
  alcoholSales: number;
  dessertSales: number;
  foodCount: number;
  beverageCount: number;
  alcoholCount: number;
  dessertCount: number;
  drinkSales: number;
  foodPct: number;
  beveragePct: number;
  alcoholPct: number;
  dessertPct: number;
  drinkPct: number;
  dessertPer100: number;
  liquorPerGuest: number;
};

export type BohTeam = {
  servers: number;
  netSales: number;
  tips: number;
  guests: number;
  avgPerGuest: number;
  avgTipPct: number;
  avgDrinkPct: number;
  liquorPct: number;
  beveragePct: number;
  dessertPct: number;
};

export type BohWeights = {
  salesPerHour: number;
  avgPerGuest: number;
  drinkPct: number;
  dessertPer100: number;
  discount: number;
};

export type BohBranchInfo = { id: string; name: string; short: string; url: string };

export type BohCoverage = { date: string; serverCount: number; uploadedAt: string };

export type BohServerPerformance = {
  ok: true;
  branch: BohBranchInfo;
  generatedAt: string;
  range: { from: string; to: string };
  weights: BohWeights;
  servers: BohServer[];
  team: BohTeam;
  coverage: BohCoverage[];
};

export type BohErrorReason =
  | "no-key" // key env var not set on our side
  | "unauthorized" // 401 — wrong/missing key
  | "not-configured" // 503 — branch hasn't set its key, or unknown branch id
  | "bad-request" // 400 — bad params
  | "server" // 5xx
  | "network"; // timeout / fetch failure

export type BohResult =
  | { ok: true; data: BohServerPerformance }
  | { ok: false; status: number; error: string; reason: BohErrorReason };

// ── Fetch with timeout + light retry on 5xx / network ───────────────────────────

const TIMEOUT_MS = 15000;

async function fetchWithRetry(url: string, key: string, attempts = 2): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { "x-api-key": key },
        signal: ctrl.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      // Retry only on 5xx (server problem) — never on 4xx (our request is wrong).
      if (res.status >= 500 && i < attempts - 1) {
        await delay(800 * (i + 1));
        continue;
      }
      return res;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (i < attempts - 1) {
        await delay(800 * (i + 1));
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch one branch's server-performance leaderboard for a date range.
 * Reads the branch's API key from its env var. A single branch failing never
 * throws — callers get a typed { ok: false } result they can render gracefully.
 */
export async function fetchServerPerformance(
  branchId: string,
  from: string,
  to: string,
): Promise<BohResult> {
  const branch = getBranch(branchId);
  if (!branch) {
    return { ok: false, status: 0, error: `Unknown branch: ${branchId}`, reason: "not-configured" };
  }

  // Trim whitespace/newlines and strip stray surrounding quotes — common when a
  // key is pasted into a dashboard env field (e.g. Vercel) with extra characters.
  const key = process.env[branch.keyEnv]?.trim().replace(/^["']|["']$/g, "");
  if (!key) {
    return {
      ok: false,
      status: 0,
      error: `No API key configured for ${branch.name}. Set ${branch.keyEnv} in the environment.`,
      reason: "no-key",
    };
  }

  const url = `${branch.baseUrl}/api/public/server-performance?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  try {
    const res = await fetchWithRetry(url, key);

    if (res.status === 401)
      return {
        ok: false,
        status: 401,
        error: `${branch.name} rejected the key in ${branch.keyEnv}. Check it matches this branch's URL (${branch.baseUrl}) and has no extra spaces/quotes.`,
        reason: "unauthorized",
      };
    if (res.status === 503)
      return { ok: false, status: 503, error: "This branch has not configured its API key yet.", reason: "not-configured" };
    if (res.status === 400) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, status: 400, error: body.error ?? "Invalid request parameters.", reason: "bad-request" };
    }
    if (!res.ok)
      return { ok: false, status: res.status, error: `Branch server error (HTTP ${res.status}).`, reason: "server" };

    const data = (await res.json()) as BohServerPerformance;
    return { ok: true, data };
  } catch (e) {
    const msg = (e as Error)?.name === "AbortError" ? "Request timed out." : (e as Error).message || "Network error.";
    return { ok: false, status: 0, error: msg, reason: "network" };
  }
}

/** Which branches currently have a key configured (for the selector + empty state). */
export function configuredBranches(): { branch: BohBranch; hasKey: boolean }[] {
  return BOH_BRANCHES.map((b) => ({ branch: b, hasKey: !!process.env[b.keyEnv] }));
}
