import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentUser, atLeast, locationScopeWhere } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InventoryItemForm } from "@/components/InventoryItemForm";

export default async function NewInventoryItemPage() {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to add items.</div>;
  if (!atLeast(user.role, Role.STORE_MANAGER)) redirect("/inventory");

  const scope = await locationScopeWhere(user);
  const locations = await prisma.location.findMany({
    where: scope.locationId ? { id: { in: scope.locationId.in } } : {},
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/inventory" className="text-sm text-[#726973] hover:text-[#440E48] hover:underline">
        ← Back to inventory
      </Link>
      <h1 className="text-[26px] font-bold tracking-tight text-[#140516]">Add inventory item</h1>
      <InventoryItemForm locations={locations} />
    </div>
  );
}
