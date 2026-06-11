import type { BohUsage, BohUsageItem } from "@/lib/boh";

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

function Sparkbars({ byDow }: { byDow: number[] }) {
  const max = Math.max(1, ...byDow);
  return (
    <div className="flex items-end gap-[3px]" title={byDow.join(" · ")}>
      {Array.from({ length: 7 }).map((_, i) => {
        const v = byDow[i] ?? 0;
        const h = Math.round((v / max) * 28);
        return (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div
              className="w-2 rounded-sm bg-[#F4A626]"
              style={{ height: `${Math.max(2, h)}px`, opacity: v === 0 ? 0.25 : 1 }}
            />
            <span className="text-[8px] leading-none text-[#C4BCC5]">{DOW[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function ItemRow({ item, top }: { item: BohUsageItem; top: boolean }) {
  return (
    <li className={`flex items-center gap-3 px-4 py-2.5 ${top ? "bg-[#FFFBF2]" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#140516]">
          {top && <span className="mr-1" title="Highest usage">⭐</span>}
          {item.label}
        </p>
        {item.portionSize != null && item.portionUnit && (
          <p className="text-xs text-[#A19BA2]">
            {item.portionSize} {item.portionUnit} / portion
          </p>
        )}
      </div>
      <Sparkbars byDow={item.byDow} />
      <div className="w-16 text-right">
        <div className="text-base font-bold text-[#440E48]">{item.total.toLocaleString()}</div>
        {item.portionUnit && <div className="text-[10px] text-[#A19BA2]">{item.portionUnit}</div>}
      </div>
    </li>
  );
}

export function BohUsagePanel({ usage }: { usage: BohUsage }) {
  const generated = usage.generatedAt
    ? new Date(usage.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight text-[#140516]">Kitchen Ingredient Usage</h2>
        <p className="text-xs text-[#A19BA2]">
          Last {usage.days} days · source: {usage.source}
          {generated && ` · updated ${generated}`}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {usage.categories.map((cat) => (
          <div key={cat.key} className="m-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[#E4DDE4] bg-[#F9F6F9] px-4 py-2.5">
              <span className="text-base">{cat.emoji}</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#726973]">{cat.label}</h3>
              <span className="ml-auto text-xs text-[#A19BA2]">{cat.items.length} items</span>
            </div>
            <ul className="divide-y divide-[#F0EBF0]">
              {cat.items.map((item, i) => (
                <ItemRow key={item.ingredientId ?? item.label} item={item} top={i === 0} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BohUnavailableNotice() {
  return (
    <section className="m-card border border-dashed border-[#E4DDE4] bg-[#FAF8FA] p-5">
      <h2 className="text-sm font-bold text-[#140516]">Kitchen Ingredient Usage</h2>
      <p className="mt-1 text-sm text-[#726973]">
        Live usage data from the BOH system isn’t available yet. Set the{" "}
        <code className="rounded bg-[#F0EBF0] px-1 text-xs text-[#440E48]">BOH_API_KEY</code> env var and
        make sure the BOH app exposes <code className="rounded bg-[#F0EBF0] px-1 text-xs text-[#440E48]">/api/public/*</code>{" "}
        without the login redirect.
      </p>
    </section>
  );
}
