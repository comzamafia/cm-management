import { getCurrentUser, atLeast } from "@/lib/auth";
import { getTrainingMaterials } from "@/lib/training";
import { prisma } from "@/lib/prisma";
import { TrainingClient } from "@/components/TrainingClient";
import { Role } from "@prisma/client";

export default async function TrainingPage() {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#676879]">Sign in to view training materials.</div>;

  const [materials, locations] = await Promise.all([
    getTrainingMaterials(),
    prisma.location.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const canCreate = atLeast(user.role, Role.STORE_MANAGER);
  const isAdmin = atLeast(user.role, Role.AREA_MANAGER);

  return (
    <TrainingClient
      materials={materials}
      canCreate={canCreate}
      isAdmin={isAdmin}
      locations={locations}
    />
  );
}
