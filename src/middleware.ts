import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAuth = !!req.auth;
  const { pathname } = req.nextUrl;

  const publicPaths = ["/login", "/access-denied", "/api/auth"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (!isAuth && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
});

export const config = {
  // Exclude /api (each route does its own auth), static assets, and favicon.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
