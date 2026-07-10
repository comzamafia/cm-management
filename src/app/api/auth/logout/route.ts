import { getSession, clearSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await getSession();
  await clearSession();
  if (session?.userId) {
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } });
    if (user) {
      logActivity(prisma, { userId: session.userId, action: "user.logout", entity: "User", entityId: session.userId, meta: { name: user.name } }).catch(() => {});
    }
  }
  return NextResponse.json({ ok: true });
}
