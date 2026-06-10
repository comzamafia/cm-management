import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { redirect } from "next/navigation";
import "./globals.css";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { auth } from "@/auth";
import { ROLE_LABEL } from "@/lib/labels";
import { Sidebar } from "@/components/Sidebar";
import { NotificationBell, type NotificationItem } from "@/components/NotificationBell";
import { getUnreadAnnouncementCount } from "@/lib/announcements";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "CM Operations",
  description: "Operational task management for multi-location teams.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = await getCurrentUser();

  // Signed in with Google but email not in the DB → access denied
  if (session && !user) {
    redirect("/access-denied");
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

  const locationLabel = user
    ? user.location
      ? user.location.name
      : "All locations"
    : "";

  return (
    <html lang="en" className={figtree.variable}>
      <body className="min-h-screen bg-[#f6f7fb] text-[#323338]">
        {user ? (
          <>
            <Sidebar
              user={{
                name: user.name,
                roleLabel: ROLE_LABEL[user.role],
                locationLabel,
              }}
              notifications={notifications}
              unreadCount={unreadCount}
              unreadAnnouncements={unreadAnnouncements}
            />
            <div className="lg:pl-60 print:pl-0">
              {/* Desktop top bar (mobile uses the sidebar's bar) */}
              <header className="sticky top-0 z-30 hidden h-14 items-center justify-end gap-3 border-b border-[#e6e9ef] bg-white/80 px-4 backdrop-blur lg:flex lg:px-8 print:hidden">
                <span className="hidden items-center gap-2 rounded-full bg-[#f6f7fb] px-3 py-1.5 text-xs font-medium text-[#676879] sm:inline-flex">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" />
                  </svg>
                  {locationLabel}
                </span>
                <NotificationBell notifications={notifications} unreadCount={unreadCount} />
              </header>

              <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
            </div>
          </>
        ) : (
          <main>{children}</main>
        )}
      </body>
    </html>
  );
}
