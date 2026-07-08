// Branch Registry for the Chiang Mai BOH Public Reporting API.
//
// The BOH backend is now a SINGLE multi-branch platform: one deployment serves
// every branch, chosen per-request via `?branch=<slug>` (the slug is the branch
// `id` below). It authenticates with one platform-wide key. (It used to be one
// separate deployment + key per branch — that model is retired; the old
// per-branch URLs/keys no longer resolve.)
//
// The platform key is read at request time (server-only) from BOH_API_KEY, with
// a fallback to the still-valid keys from the old setup so existing deployments
// keep working with no env changes. Keys are NEVER hard-coded.

export type BohBranch = {
  id: string; // also the API's branch slug (e.g. "yorkmills")
  name: string; // full display name, e.g. "Chiang Mai Park Lawn"
  short: string; // short label, e.g. "Park Lawn"
};

// Base URL of the consolidated BOH platform (no trailing slash). Overridable via
// BOH_API_URL; defaults to the York Mills deployment, which serves all branches.
export const BOH_PLATFORM_URL = (process.env.BOH_API_URL || "https://yorkmills.sujeevan.ca").replace(/\/+$/, "");

// Env vars checked, in order, for the platform key. BOH_API_KEY is preferred;
// the York Mills / Park Lawn legacy keys are accepted as a fallback (both work
// platform-wide) so nothing breaks before BOH_API_KEY is set. The old
// BOH_KEY_MISSISSAUGA key is deliberately NOT here — it was revoked when the
// standalone www.sujeevan.ca deployment was retired, so trying it just 401s.
export const BOH_KEY_ENVS = ["BOH_API_KEY", "BOH_KEY_YORKMILLS", "BOH_KEY_PARKLAWN"] as const;

/** The platform API key from env, trimmed and stripped of stray surrounding quotes. */
export function platformKey(): string | undefined {
  for (const name of BOH_KEY_ENVS) {
    const raw = process.env[name]?.trim().replace(/^["']|["']$/g, "");
    if (raw) return raw;
  }
  return undefined;
}

export const BOH_BRANCHES: BohBranch[] = [
  { id: "mississauga", name: "Chiang Mai Mississauga", short: "Mississauga" },
  { id: "yorkmills", name: "Chiang Mai York Mills", short: "York Mills" },
  { id: "parklawn", name: "Chiang Mai Park Lawn", short: "Park Lawn" },
];

export function getBranch(id: string): BohBranch | undefined {
  return BOH_BRANCHES.find((b) => b.id === id);
}
