import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import "./globals.css";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { auth } from "@/auth";
import { ROLE_LABEL } from "@/lib/labels";
import { SignOutButton } from "@/components/SignOutButton";
import { NotificationBell, type NotificationItem } from "@/components/NotificationBell";

export const metadata: Metadata = {
  title: "CM Operations",
  description: "Operational Task Management — Who, What, Where, When.",
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

  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="bg-slate-900 text-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="text-lg font-semibold">
                CM<span className="text-emerald-400">Ops</span>
              </Link>
              <nav className="flex gap-1 text-sm">
                <Link href="/dashboard" className="rounded-md px-3 py-1.5 hover:bg-slate-700">
                  Dashboard
                </Link>
                <Link href="/tasks" className="rounded-md px-3 py-1.5 hover:bg-slate-700">
                  Tasks
                </Link>
                <Link href="/checklists" className="rounded-md px-3 py-1.5 hover:bg-slate-700">
                  Checklists
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              {user && (
                <NotificationBell
                  notifications={notifications}
                  unreadCount={unreadCount}
                />
              )}
              {user && <SignOutButton />}
            </div>
          </div>
        </header>

        {user && (
          <div className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-6xl px-4 py-1.5 text-xs text-slate-500">
              Signed in as{" "}
              <span className="font-medium text-slate-700">{user.name}</span> ·{" "}
              {ROLE_LABEL[user.role]}
              {user.location ? ` · ${user.location.name}` : " · All locations"}
            </div>
          </div>
        )}

        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
