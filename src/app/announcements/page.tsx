import { getCurrentUser, atLeast } from "@/lib/auth";
import { getAnnouncements } from "@/lib/announcements";
import { prisma } from "@/lib/prisma";
import { AnnouncementsClient } from "@/components/AnnouncementsClient";
import { Role } from "@prisma/client";

export default async function AnnouncementsPage() {
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#676879]">Sign in to view announcements.</div>;

  const [announcements, locations] = await Promise.all([
    getAnnouncements(),
    prisma.location.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const canCreate = atLeast(user.role, Role.STORE_MANAGER);
  const isAdmin = atLeast(user.role, Role.AREA_MANAGER);

  return (
    <AnnouncementsClient
      announcements={announcements}
      canCreate={canCreate}
      isAdmin={isAdmin}
      locations={locations}
    />
  );
}
