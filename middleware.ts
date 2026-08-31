import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MP_HOSTS = ["dashboard.marketpiloting.com", "dashboard.marketpiloting.online", "affiliates.marketpiloting.com", "localhost"];
const AFFILIATE_HOST = "affiliates.marketpiloting.com";

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
  "/sites/",
  "/team/accept",
  "/auth/twitter",
  "/api/",
  "/affiliate",
  "/ref/",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") || "";
  const bareHost = host.split(":")[0];

  // Affiliate domain — all traffic is public, next.config.mjs handles the rewrite
  if (bareHost === AFFILIATE_HOST) {
    return NextResponse.next();
  }

  // Affiliate domain handled by next.config.mjs rewrites

  // Custom domain rewrite — if host is not one of our own domains,
  // look up the slug and rewrite to /sites/[slug]
  const isOwnHost = MP_HOSTS.some((h) => bareHost === h || bareHost.endsWith(".vercel.app"));
  if (!isOwnHost && bareHost) {
    try {
      const res = await fetch(`${API_URL}/sites/domain/${encodeURIComponent(bareHost)}`, {
        next: { revalidate: 300 },
      });
      if (res.ok) {
        const { slug } = await res.json();
        if (slug) {
          return NextResponse.rewrite(new URL(`/sites/${slug}${pathname === "/" ? "" : pathname}`, req.url));
        }
      }
    } catch {
      // Domain not mapped — fall through to normal routing
    }
  }

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // mp_session is a presence cookie set by auth-context on login, cleared on logout.
  // It contains no sensitive data — just signals that a session exists.
  const session = req.cookies.get("mp_session")?.value;
  if (!session) {
    const loginUrl = new URL("/login", "https://dashboard.marketpiloting.com");
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|favicon.png|manifest.json|logo-intro.mp4).*)"],
};
