import type { Metadata } from "next";
import { IBM_Plex_Sans, Cormorant_Garamond } from "next/font/google";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import "./globals.css";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canSeeActionPlan, canSeeMarketing } from "@/lib/action-plan";
import { getSession, clearSession } from "@/lib/session";
import { ROLE_LABEL } from "@/lib/labels";
import { Sidebar } from "@/components/Sidebar";
import { NotificationBell, type NotificationItem } from "@/components/NotificationBell";
import { getUnreadAnnouncementCount } from "@/lib/announcements";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const ibmPlex = IBM_Plex_Sans({
  variable: "--font-ibm",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CM Operations",
  description: "Operational task management for Chiang Mai Thai Dining.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "CM Ops" },
};

export const viewport = {
  themeColor: "#440E48",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Valid session token but user deleted from DB — clear stale cookie
  if (!user) {
    const session = await getSession();
    if (session) {
      await clearSession();
      redirect("/login");
    }
  }

  // Compliance-support accounts are confined to the Compliance page. Any other
  // route (typed URL, default /dashboard landing, etc.) bounces back there.
  if (user?.role === "COMPLIANCE") {
    const pathname = (await headers()).get("x-pathname") ?? "";
    if (!pathname.startsWith("/compliance")) {
      redirect("/compliance");
    }
  }

  const notifications: NotificationItem[] = user
    ? await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];
  const unreadCount = notifications.filter((n) => !n.read).length;
  const unreadAnnouncements = user ? await getUnreadAnnouncementCount() : 0;
  const SUJEE_ID = "cmq92qov50001jo04684n5q3c";
  const ADMIN_ID = "cmq8jcoyy0003l2045vyu6suw";
  const showActionPlan = await canSeeActionPlan(user);
  const showMarketing = await canSeeMarketing(user);
  const showAuditLogs = user?.id === SUJEE_ID;
  // Sujee and the Administrator get direct menus to specific people's trackers.
  const personTrackers =
    user && (user.id === SUJEE_ID || user.id === ADMIN_ID)
      ? ["Manali", "Liz", "Wine", "Komal"].map((label) => ({ label, href: `/tracker/${label.toLowerCase()}` }))
      : [];

  const locationLabel = user
    ? user.location
      ? user.location.name
      : "All locations"
    : "";

  return (
    <html lang="en" className={`${ibmPlex.variable} ${cormorant.variable}`}>
      <body className="min-h-screen bg-[#F9F6F9] text-[#140516]">
        <ServiceWorkerRegister />
        {user ? (
          <>
            <Sidebar
              user={{
                name: user.name,
                role: user.role,
                roleLabel: ROLE_LABEL[user.role],
                locationLabel,
              }}
              notifications={notifications}
              unreadCount={unreadCount}
              unreadAnnouncements={unreadAnnouncements}
              showActionPlan={showActionPlan}
              showMarketing={showMarketing}
              showAuditLogs={showAuditLogs}
              personTrackers={personTrackers}
            />
            <div className="lg:pl-60 print:pl-0">
              {/* Desktop top bar */}
              <header className="sticky top-0 z-30 hidden h-14 items-center justify-end gap-3 border-b border-[#E4DDE4] bg-white/85 px-4 backdrop-blur lg:flex lg:px-8 print:hidden">
                <span className="hidden items-center gap-2 rounded-full bg-[#F9F6F9] px-3 py-1.5 text-xs font-medium text-[#726973] sm:inline-flex">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {locationLabel}
                </span>
                <NotificationBell notifications={notifications} unreadCount={unreadCount} />
              </header>

              <main className="mx-auto max-w-7xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">{children}</main>
            </div>
          </>
        ) : (
          <main>{children}</main>
        )}
      </body>
    </html>
  );
}
