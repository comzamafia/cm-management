import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isManager } from "@/lib/auth";
import { getScopedLocations } from "@/lib/checklists";
import { NewChecklistForm } from "@/components/NewChecklistForm";

export default async function NewChecklistPage() {
  const user = await getCurrentUser();
  if (!user || !isManager(user.role)) redirect("/checklists");

  const locations = await getScopedLocations();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/checklists" className="text-sm text-slate-500 hover:underline">
        ← Back to checklists
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900">New Checklist Template</h1>
      <NewChecklistForm locations={locations} />
    </div>
  );
}
