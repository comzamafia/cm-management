import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-please-set-AUTH_SECRET-in-env"
);

const PUBLIC = ["/login", "/api/auth"];

// Forward the current path to server components. The root layout reads this to
// enforce role-based page access, which can't be done from the edge JWT alone.
function withPathname(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("cm_session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    await jwtVerify(token, SECRET);
    return withPathname(req);
  } catch {
    // Expired or tampered token — clear cookie and redirect
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("cm_session");
    return res;
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
