import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (user.status === "INACTIVE") {
    return NextResponse.json({ error: "Your account is inactive. Contact your manager." }, { status: 403 });
  }

  // Bootstrap mode: if BOOTSTRAP_PASSWORD is set and user has no password yet,
  // allow login and auto-set their hash. Remove BOOTSTRAP_PASSWORD from env once all users are set up.
  if (!user.passwordHash) {
    const bootstrap = process.env.BOOTSTRAP_PASSWORD;
    if (!bootstrap || password !== bootstrap) {
      return NextResponse.json(
        { error: "Password not set for this account. Ask your manager to set it." },
        { status: 401 }
      );
    }
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash, lastLoginAt: new Date() } });
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  logActivity(prisma, { userId: user.id, action: "user.login", entity: "User", entityId: user.id, meta: { name: user.name } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
