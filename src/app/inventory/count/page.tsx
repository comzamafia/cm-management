import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getInventory } from "@/lib/inventory";
import { InventoryCountForm } from "@/components/InventoryCountForm";

export default async function InventoryCountPage() {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to count stock.</div>;

  const items = await getInventory();

  // Counting happens per location. Use the user's own location; if a multi-location
  // manager, count the first scoped location's items (kept simple for Phase 5).
  const locationId = items[0]?.locationId ?? user.locationId ?? "";

  if (!locationId || items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link href="/inventory" className="text-sm text-[#726973] hover:underline">
          ← Back to inventory
        </Link>
        <div className="m-card p-10 text-center text-sm text-[#A19BA2]">No items to count yet.</div>
      </div>
    );
  }

  const scoped = items.filter((i) => i.locationId === locationId);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/inventory" className="text-sm text-[#726973] hover:text-[#440E48] hover:underline">
        ← Back to inventory
      </Link>
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">Stock count</h1>
        <p className="mt-1 text-sm text-[#726973]">Enter what you have on hand. Leave blank to skip an item.</p>
      </div>
      <InventoryCountForm locationId={locationId} items={scoped} />
    </div>
  );
}
