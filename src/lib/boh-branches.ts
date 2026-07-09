// Branch Registry for the Chiang Mai BOH Public Reporting API.
//
// The BOH backend is a SINGLE multi-branch platform: one deployment serves every
// branch, chosen per-request via `?branch=<slug>` (the slug is the branch `id`
// below), authenticated by one platform-wide key. (It used to be one separate
// deployment + key per branch — that model is retired.)
//
// Canonical host is https://www.sujeevan.ca (project sujeevan-staging). NOTE: use
// the `www.` host, NOT the apex `sujeevan.ca` — the apex 308-redirects to www and
// the redirect drops the `x-api-key` header on our server-to-server calls, which
// then 401s. Overridable via BOH_API_URL.
//
// The platform key is read at request time (server-only) from BOH_API_KEY.
// Keys are NEVER hard-coded.

export type BohBranch = {
  id: string; // also the API's branch slug (e.g. "yorkmills")
  name: string; // full display name, e.g. "Chiang Mai Park Lawn"
  short: string; // short label, e.g. "Park Lawn"
};

// Base URL of the consolidated BOH platform (no trailing slash). Overridable via
// BOH_API_URL. Must be the www host (see note above), not the apex domain.
export const BOH_PLATFORM_URL = (process.env.BOH_API_URL || "https://www.sujeevan.ca").replace(/\/+$/, "");

// The platform key comes ONLY from BOH_API_KEY. The old per-branch keys
// (BOH_KEY_YORKMILLS / PARKLAWN / MISSISSAUGA) are intentionally NOT accepted:
// they authenticate only against their retired subdomains, so against the
// canonical www platform they 401 — and a stale one silently standing in for a
// missing BOH_API_KEY produced exactly the confusing "key rejected" failure we
// hit. With only BOH_API_KEY, a missing key gives a clear "no key" message
// instead.
export const BOH_KEY_ENVS = ["BOH_API_KEY"] as const;

/** The platform API key from env, trimmed and stripped of stray surrounding quotes. */
export function platformKey(): string | undefined {
  for (const name of BOH_KEY_ENVS) {
    const raw = process.env[name]?.trim().replace(/^["']|["']$/g, "");
    if (raw) return raw;
  }
  return undefined;
}

// The platform serves all six branches; the slug is each branch's `id`.
export const BOH_BRANCHES: BohBranch[] = [
  { id: "mississauga", name: "Chiang Mai Mississauga", short: "Mississauga" },
  { id: "yorkmills", name: "Chiang Mai York Mills", short: "York Mills" },
  { id: "parklawn", name: "Chiang Mai Park Lawn", short: "Park Lawn" },
  { id: "liberty", name: "Chiang Mai Liberty", short: "Liberty" },
  { id: "danforth", name: "Chiang Mai Danforth", short: "Danforth" },
  { id: "junction", name: "Chiang Mai Junction", short: "Junction" },
];

export function getBranch(id: string): BohBranch | undefined {
  return BOH_BRANCHES.find((b) => b.id === id);
}
