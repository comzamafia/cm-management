// Integration with the external Chiang Mai BOH (Back-of-House) usage-report API.
// The API key is read from the BOH_API_KEY env var — never hardcode it.
// Endpoint currently sits behind the BOH app's auth middleware; until that
// middleware exempts /api/public/*, calls return a 307 redirect (handled here
// as "unavailable" rather than crashing).

const BASE = "https://www.sujeevan.ca/api/public/usage-report";

export type BohUsageItem = {
  label: string;
  byDow: number[]; // Mon..Sun
  total: number;
  portionSize?: number;
  portionUnit?: string;
  ingredientId?: string;
};

export type BohCategory = {
  key: string;
  label: string;
  emoji: string;
  items: BohUsageItem[];
};

export type BohUsage = {
  source: string;
  generatedAt: string;
  days: number;
  dowCounts: number[];
  categories: BohCategory[];
};

const CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: "protein", label: "Protein", emoji: "🍗" },
  { key: "curry", label: "Curry", emoji: "🍛" },
  { key: "dessert", label: "Dessert", emoji: "🍮" },
  { key: "beverage", label: "Beverage", emoji: "🥤" },
  { key: "iceCream", label: "Ice Cream", emoji: "🍨" },
];

type RawItem = {
  label?: string;
  flavor?: string;
  byDow?: number[];
  total?: number;
  portionSize?: number;
  portionUnit?: string;
  ingredientId?: string;
};

/**
 * Fetch the BOH usage report. Returns null if the key is missing or the API
 * is unreachable / not returning JSON (e.g. redirected to login).
 */
export async function getBohUsage(days = 7): Promise<BohUsage | null> {
  const key = process.env.BOH_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(`${BASE}?days=${days}`, {
      headers: { "x-api-key": key, Accept: "application/json" },
      redirect: "manual", // a 307 → login must NOT be followed
      next: { revalidate: 600 }, // cache 10 minutes
    });

    if (!res.ok) return null; // 307/4xx/5xx → unavailable
    if (!(res.headers.get("content-type") || "").includes("application/json")) return null;

    const data = (await res.json()) as Record<string, unknown> & { ok?: boolean };
    if (!data?.ok) return null;

    const categories: BohCategory[] = CATEGORIES.map((c) => {
      const raw = Array.isArray(data[c.key]) ? (data[c.key] as RawItem[]) : [];
      const items: BohUsageItem[] = raw
        .map((it) => ({
          label: it.label ?? it.flavor ?? "—",
          byDow: Array.isArray(it.byDow) ? it.byDow.map((n) => Number(n) || 0) : [],
          total: Number(it.total ?? 0),
          portionSize: it.portionSize,
          portionUnit: it.portionUnit,
          ingredientId: it.ingredientId,
        }))
        .sort((a, b) => b.total - a.total);
      return { ...c, items };
    }).filter((c) => c.items.length > 0);

    return {
      source: String(data.source ?? "boh"),
      generatedAt: String(data.generatedAt ?? ""),
      days: Number(data.days ?? days),
      dowCounts: Array.isArray(data.dowCounts) ? (data.dowCounts as number[]) : [],
      categories,
    };
  } catch {
    return null;
  }
}
