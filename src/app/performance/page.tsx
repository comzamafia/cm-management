import { getCurrentUser, isManager } from "@/lib/auth";
import { localDateISO } from "@/lib/time";
import { fetchServerPerformance, configuredBranches, type BohResult } from "@/lib/boh-api";
import { PerformanceControls } from "@/components/PerformanceControls";
import { PerformanceReport } from "@/components/PerformanceReport";

export const dynamic = "force-dynamic";

const MAX_RANGE_DAYS = 366;

// Validate a YYYY-MM-DD string.
function validDate(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86400000,
  );
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to view performance.</div>;
  if (!isManager(user.role) && user.role !== "SHIFT_LEAD") {
    return <div className="text-[#726973]">Manager access required.</div>;
  }

  const branchesWithKeys = configuredBranches();
  const anyKey = branchesWithKeys.some((b) => b.hasKey);

  const sp = await searchParams;

  // Default branch: requested → first with a key → first in registry.
  const requested = sp.branch ? branchesWithKeys.find((b) => b.branch.id === sp.branch) : undefined;
  const fallback = branchesWithKeys.find((b) => b.hasKey) ?? branchesWithKeys[0];
  const selected = requested ?? fallback;
  const branchId = selected.branch.id;

  // Default range: last 7 days (Toronto business dates).
  const today = localDateISO(new Date());
  const defaultFrom = localDateISO(new Date(Date.parse(`${today}T00:00:00Z`) - 6 * 86400000));
  let from = validDate(sp.from) ? sp.from : defaultFrom;
  let to = validDate(sp.to) ? sp.to : today;
  if (from > to) [from, to] = [to, from];
  // Clamp range length.
  let rangeError: string | null = null;
  if (daysBetween(from, to) > MAX_RANGE_DAYS) {
    rangeError = `Range exceeds ${MAX_RANGE_DAYS} days — shorten the dates.`;
  }

  const branchOpts = branchesWithKeys.map((b) => ({
    id: b.branch.id,
    label: b.branch.name,
    hasKey: b.hasKey,
  }));

  // Fetch only when at least one branch is configured and range is valid.
  let result: BohResult | null = null;
  if (anyKey && !rangeError) {
    result = await fetchServerPerformance(branchId, from, to);
  }

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">Server Performance</h1>
        <p className="mt-0.5 text-sm text-[#726973]">
          Live leaderboard pulled from each branch&apos;s BOH reporting API. Pick a branch and date range, then Export PDF.
        </p>
      </div>

      <PerformanceControls branches={branchOpts} branchId={branchId} from={from} to={to} />

      {rangeError && (
        <Panel tone="warn" title="Invalid date range">{rangeError}</Panel>
      )}

      {!anyKey && (
        <Panel tone="info" title="No branch API keys configured yet">
          <p>
            Add each branch&apos;s API key as an environment variable, then redeploy. The page goes live automatically once a key is present.
          </p>
          <ul className="mt-2 space-y-1">
            {branchesWithKeys.map((b) => (
              <li key={b.branch.id} className="font-mono text-xs">
                {b.branch.keyEnv} <span className="text-[#A19BA2]">→ {b.branch.name} ({b.branch.baseUrl})</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {result && !result.ok && (
        <Panel tone={result.reason === "no-key" || result.reason === "not-configured" ? "info" : "warn"}
          title={errorTitle(result)}>
          <p>{result.error}</p>
          {result.reason === "no-key" && (
            <p className="mt-1 font-mono text-xs text-[#A19BA2]">Set {selected.branch.keyEnv} in the environment.</p>
          )}
          {(result.reason === "server" || result.reason === "network") && (
            <p className="mt-1 text-xs text-[#A19BA2]">This branch may be temporarily unavailable — try again shortly.</p>
          )}
        </Panel>
      )}

      {result && result.ok && <PerformanceReport data={result.data} />}
    </div>
  );
}

function errorTitle(r: Extract<BohResult, { ok: false }>): string {
  switch (r.reason) {
    case "no-key": return "Branch not configured";
    case "not-configured": return "Branch not configured";
    case "unauthorized": return "API key rejected";
    case "bad-request": return "Invalid request";
    case "server": return "Branch server error";
    case "network": return "Could not reach branch";
    default: return "Unable to load report";
  }
}

function Panel({
  tone,
  title,
  children,
}: {
  tone: "info" | "warn";
  title: string;
  children: React.ReactNode;
}) {
  const styles = tone === "warn"
    ? { bg: "#FDF6E7", border: "#F4D58A", text: "#8A5A00" }
    : { bg: "#F2F7FD", border: "#BBD6F2", text: "#1D5FA8" };
  return (
    <div className="rounded-xl border p-4 text-sm print:hidden"
      style={{ backgroundColor: styles.bg, borderColor: styles.border, color: styles.text }}>
      <div className="font-bold">{title}</div>
      <div className="mt-1 leading-relaxed">{children}</div>
    </div>
  );
}
