import { NextResponse } from "next/server";

// NextAuth removed. Login: POST /api/auth/login  Logout: POST /api/auth/logout
export function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
export function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
