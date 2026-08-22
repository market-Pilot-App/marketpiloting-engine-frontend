import { NextRequest, NextResponse } from "next/server";

// Routes that never require auth
const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/p/",
  "/bio/",
  "/offer/",
  "/review/",
  "/report/",
  "/team/accept",
  "/auth/twitter",
  "/api/",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // mp_session is a presence cookie set by auth-context on login, cleared on logout.
  // It contains no sensitive data — just signals that a session exists.
  const session = req.cookies.get("mp_session")?.value;
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|favicon.png|manifest.json|logo-intro.mp4).*)"],
};
