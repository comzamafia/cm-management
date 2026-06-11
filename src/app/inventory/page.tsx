import Link from "next/link";
import { Role } from "@prisma/client";
import { getCurrentUser, atLeast } from "@/lib/auth";
import { getInventory } from "@/lib/inventory";
import { getBohUsage } from "@/lib/boh";
import { BohUsagePanel, BohUnavailableNotice } from "@/components/BohUsagePanel";
import { INVENTORY_UNIT_LABEL } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to view inventory.</div>;

  const [items, bohUsage] = await Promise.all([getInventory(), getBohUsage(7)]);
  const canManage = atLeast(user.role, Role.STORE_MANAGER);
  const lowCount = items.filter((i) => i.low).length;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">Inventory</h1>
          <p className="mt-1 text-sm text-[#726973]">
            {items.length} item{items.length === 1 ? "" : "s"}
            {lowCount > 0 && (
              <span className="ml-2 rounded-full bg-[#FFF0EE] px-2 py-0.5 text-xs font-semibold text-[#943B13]">
                {lowCount} low
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <a
              href="/api/reports?type=inventory"
              className="rounded-xl border border-[#E4DDE4] px-3 py-2.5 text-sm font-medium text-[#726973] transition hover:bg-[#F0EBF0]"
            >
              ↓ CSV
            </a>
          )}
          {items.length > 0 && (
            <Link
              href="/inventory/count"
              className="rounded-xl bg-[#440E48] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5A1560]"
            >
              Start a count
            </Link>
          )}
          {canManage && (
            <Link
              href="/inventory/items/new"
              className="rounded-xl bg-[#F0EBF0] px-4 py-2.5 text-sm font-semibold text-[#440E48] transition hover:bg-[#E4DDE4]"
            >
              + Add item
            </Link>
          )}
        </div>
      </div>

      {/* Kitchen ingredient usage from the BOH system */}
      {bohUsage ? <BohUsagePanel usage={bohUsage} /> : <BohUnavailableNotice />}

      <h2 className="text-lg font-bold tracking-tight text-[#140516]">Stock on hand</h2>
      {items.length === 0 ? (
        <div className="m-card p-10 text-center text-sm text-[#A19BA2]">
          No items yet.{canManage ? " Add your first item to start tracking stock." : ""}
        </div>
      ) : (
        <div className="m-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E4DDE4] text-left text-xs uppercase tracking-wider text-[#A19BA2]">
                <th className="px-4 py-2.5 font-semibold">Item</th>
                <th className="px-4 py-2.5 font-semibold">Category</th>
                <th className="px-4 py-2.5 text-right font-semibold">On hand</th>
                <th className="px-4 py-2.5 text-right font-semibold">Par</th>
                <th className="px-4 py-2.5 text-right font-semibold">Reorder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EBF0]">
              {items.map((i) => (
                <tr key={i.id} className={i.low ? "bg-[#FFF7F5]" : ""}>
                  <td className="px-4 py-2.5 font-medium text-[#140516]">
                    {i.name}
                    {i.low && (
                      <span className="ml-2 rounded-full bg-[#e2445c] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        LOW
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[#726973]">{i.category ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#140516]">
                    {i.currentQty} <span className="text-xs font-normal text-[#A19BA2]">{INVENTORY_UNIT_LABEL[i.unit]}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-[#726973]">{i.parLevel ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right text-[#726973]">{i.reorderLevel ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
