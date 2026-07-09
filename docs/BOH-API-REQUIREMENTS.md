# BOH Reporting API — Integration Requirements

**Audience:** the sujeevan.ca / BOH platform team.
**Consumer:** the CM Operations app (`cm.sujeevan.ca`), page `/performance`.

CM Operations pulls each branch's server-performance leaderboard live from the
BOH reporting platform. This document lists exactly what the platform side needs
to expose (and keep stable) so our side can pull cleanly.

---

## Status: ✅ Implemented

The platform team provisioned the canonical setup. Current production config:

- **Canonical host:** `https://www.sujeevan.ca` (project `sujeevan-staging`),
  serves directly (no redirect). All 6 branch slugs return `200` via `?branch=`.
  **Use `www.sujeevan.ca`, not the apex `sujeevan.ca`** — the apex 308-redirects
  to www and the redirect drops the `x-api-key` header on server-to-server calls,
  which then 401s.
- **Key:** a single platform key (stored their side as `SERVER_PERF_API_KEY`).
- **Our Vercel env:** `BOH_API_URL=https://www.sujeevan.ca` + `BOH_API_KEY=<key>`.
- **Legacy subdomains** (`yorkmills.` / `parklawn.`) still answer `200` but are
  deprecated and may be retired anytime — not used by the canonical config.

⚠️ **Do not rotate/revoke the key silently** — a silent revoke is exactly what
broke the old Mississauga key (and, mid-migration, the Park Lawn key). Notify the
CM team before changing it.

The sections below are the original requirements, kept for reference.

---

## 1. Current state (what we observed)

- The BOH backend was consolidated from **one deployment per branch** into a
  **single multi-branch platform**.
- The platform is currently reachable at the **subdomains**
  `https://yorkmills.sujeevan.ca` and `https://parklawn.sujeevan.ca` — each
  serves **every** branch via `?branch=<slug>`, authenticated by a single key.
- The **apex/main domain does not serve this API**: `https://sujeevan.ca` and
  `https://www.sujeevan.ca` return `401 {"error":"Invalid or missing API key."}`
  **even with a key that works on the subdomains**. So the reporting API is not
  wired up on the main domain yet.
- The old per-branch Mississauga key (for `www.sujeevan.ca`) was **revoked** when
  that standalone deployment was retired — it now `401`s everywhere.

Our side already works by pointing at `yorkmills.sujeevan.ca`. The items below are
what we need to make it **canonical, stable, and low-maintenance**.

---

## 2. The endpoint contract (please keep stable)

**Request**

```
GET {BASE_URL}/api/public/server-performance?from=YYYY-MM-DD&to=YYYY-MM-DD&branch=<slug>
Header: x-api-key: <PLATFORM_KEY>
```

- `from` / `to`: inclusive business-date range (Toronto time). We clamp to ≤ 366 days.
- `branch`: the branch **slug** (see §3). Required now that one deployment hosts
  many branches.
- Auth: the key in the `x-api-key` request header.

**Success:** `200` with JSON of this shape (fields we actually read):

```jsonc
{
  "ok": true,
  "branch": { "id": "yorkmills", "name": "Chiang Mai York Mills", "short": "...", "url": "..." },
  "generatedAt": "2026-07-08T15:37:39.193Z",
  "range": { "from": "2026-07-01", "to": "2026-07-01" },
  "weights": { "salesPerHour": 0, "avgPerGuest": 0, "drinkPct": 0, "dessertPer100": 0, "discount": 0 },
  "servers": [ { "name": "...", "isStation": false, "score": 0, "shifts": 0, "hours": 0,
                 "netSales": 0, "grossSales": 0, "discount": 0, "discountPct": 0, "tips": 0,
                 "tipPct": 0, "guests": 0, "orders": 0, "salesPerHour": 0, "avgPerGuest": 0,
                 "avgPerOrder": 0, "foodSales": 0, "beverageSales": 0, "alcoholSales": 0,
                 "dessertSales": 0, "foodCount": 0, "beverageCount": 0, "alcoholCount": 0,
                 "dessertCount": 0, "drinkSales": 0, "foodPct": 0, "beveragePct": 0,
                 "alcoholPct": 0, "dessertPct": 0, "drinkPct": 0, "dessertPer100": 0,
                 "liquorPerGuest": 0 } ],
  "team": { "servers": 0, "netSales": 0, "tips": 0, "guests": 0, "avgPerGuest": 0,
            "avgTipPct": 0, "avgDrinkPct": 0, "liquorPct": 0, "beveragePct": 0, "dessertPct": 0 },
  "coverage": [ { "date": "2026-07-01", "serverCount": 0, "uploadedAt": "..." } ]
}
```

**Errors we already handle** (please keep these status codes meaningful):

| Status | Meaning |
|--------|---------|
| `401`  | wrong / missing key |
| `400`  | bad params (e.g. missing `branch`, bad dates) — return `{ "error": "..." }` |
| `404`  | unknown / inactive branch slug — return `{ "error": "..." }` |
| `5xx`  | server error (we retry once) |

Please **do not change field names or the response shape** without telling us —
our parser maps them directly.

---

## 3. Branch slugs (please keep stable)

Our app selects a branch by these slugs (they match the `branch.id` you return):

```
mississauga, yorkmills, parklawn, liberty, danforth, junction
```

If you **add, rename, or retire** a branch slug, tell us so we can update the
registry (`src/lib/boh-branches.ts`).

---

## 4. What we need from you

1. **One stable base URL.** Decide the canonical host and confirm the endpoint
   above serves `200` there. If you want us to use `https://sujeevan.ca`, that
   host must expose `/api/public/server-performance` and accept the platform key
   — **today it returns 401 there.** Give us the final URL → we set `BOH_API_URL`.

2. **One platform API key.** Issue a single key that authenticates for **all**
   branches (the way the York Mills / Park Lawn keys already do). We store it as
   `BOH_API_KEY`. **Do not rotate or revoke it without notifying us** — a silent
   revoke is exactly what broke Mississauga.

3. **Keep the contract stable** — the endpoint, query params, `x-api-key` header,
   the slug list (§3), and the JSON shape (§2).

4. **No CORS needed.** We call the API **server-to-server** (from our Next.js
   server, not the browser), so you do **not** need to add CORS headers.

5. **(Nice to have) a discovery endpoint** —
   `GET /api/public/branches` → `[{ "slug": "...", "name": "..." }]`.
   Currently `404`. If you add it, our side can auto-sync the branch list instead
   of hardcoding slugs.

6. **Rate/uptime.** Requests are on-demand (one per page view / PDF export), not
   polling. If you rate-limit, a small per-key allowance is plenty. Let us know
   any limits.

---

## 5. On our side (for reference)

- `BOH_API_URL` — platform base URL (default `https://yorkmills.sujeevan.ca`).
- `BOH_API_KEY` — the single platform key (falls back to `BOH_KEY_YORKMILLS` /
  `BOH_KEY_PARKLAWN` if not set).

Once you give us **(1)** a canonical URL and **(2)** a stable platform key, we set
those two environment variables in Vercel and nothing else needs to change.
