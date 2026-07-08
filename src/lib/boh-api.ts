// Server-only module: reads API keys from process.env. Only import from server
// components / route handlers, never from a "use client" file.
import { BOH_BRANCHES, BOH_PLATFORM_URL, getBranch, platformKey, type BohBranch } from "./boh-branches";

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

  // One platform key serves every branch (see boh-branches.ts). Already trimmed
  // and de-quoted there.
  const key = platformKey();
  if (!key) {
    return {
      ok: false,
      status: 0,
      error: `No BOH API key configured. Set BOH_API_KEY in the environment.`,
      reason: "no-key",
    };
  }

  // The branch is selected with ?branch=<slug> against the shared platform.
  const url = `${BOH_PLATFORM_URL}/api/public/server-performance?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&branch=${encodeURIComponent(branch.id)}`;

  try {
    const res = await fetchWithRetry(url, key);

    if (res.status === 401)
      return {
        ok: false,
        status: 401,
        error: `BOH platform rejected the API key. Check BOH_API_KEY (or a legacy BOH_KEY_* fallback) at ${BOH_PLATFORM_URL} — no extra spaces/quotes.`,
        reason: "unauthorized",
      };
    if (res.status === 503)
      return { ok: false, status: 503, error: "This branch has not configured its API key yet.", reason: "not-configured" };
    if (res.status === 400) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, status: 400, error: body.error ?? "Invalid request parameters.", reason: "bad-request" };
    }
    if (res.status === 404) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, status: 404, error: body.error ?? `Unknown branch "${branch.id}".`, reason: "not-configured" };
    }
    if (!res.ok)
      return { ok: false, status: res.status, error: `Branch server error (HTTP ${res.status}).`, reason: "server" };

    const data = (await res.json()) as BohServerPerformance;

    // Integrity guard: the platform echoes which branch the data is for. If it
    // ever doesn't match the slug we asked for, refuse to show it rather than
    // risk labelling one branch's numbers as another's.
    if (data?.branch?.id && data.branch.id !== branch.id) {
      return {
        ok: false,
        status: 200,
        error: `Branch mismatch: requested "${branch.id}" but the platform returned "${data.branch.id}". Not showing possibly-wrong data.`,
        reason: "server",
      };
    }

    return { ok: true, data };
  } catch (e) {
    const msg = (e as Error)?.name === "AbortError" ? "Request timed out." : (e as Error).message || "Network error.";
    return { ok: false, status: 0, error: msg, reason: "network" };
  }
}

/** All branches, flagged by whether the shared platform key is configured. */
export function configuredBranches(): { branch: BohBranch; hasKey: boolean }[] {
  const hasKey = !!platformKey();
  return BOH_BRANCHES.map((b) => ({ branch: b, hasKey }));
}
