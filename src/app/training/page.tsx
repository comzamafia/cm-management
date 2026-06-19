import { getCurrentUser, atLeast } from "@/lib/auth";
import { getCourses } from "@/lib/courses";
import { prisma } from "@/lib/prisma";
import { TrainingLMS } from "@/components/TrainingLMS";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function TrainingPage() {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to view training.</div>;

  const [courses, locations] = await Promise.all([
    getCourses(),
    prisma.location.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const canCreate = atLeast(user.role, Role.STORE_MANAGER);

  return (
    <TrainingLMS
      courses={courses}
      canCreate={canCreate}
      locations={locations}
    />
  );
}
