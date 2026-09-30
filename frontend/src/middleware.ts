import { NextRequest, NextResponse } from "next/server";

// support.vezo.exchange is an extra domain on this same Vercel project, so
// without this every app route would answer there too (support.vezo.exchange/
// marketplace served the whole marketplace, which is confusing for users and
// duplicate content for crawlers).
//
// The rule: that host serves the support page at its root and nothing else.
// Any other page path is redirected to the canonical www domain. API routes and
// build assets are left alone, because the support page itself needs them.
const SUPPORT_HOSTS = ["support.vezo.exchange"];
const CANONICAL_ORIGIN = "https://www.vezo.exchange";

function isSupportHost(host: string): boolean {
  return SUPPORT_HOSTS.includes(host) || host.startsWith("support.localhost");
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  if (!isSupportHost(host)) return NextResponse.next();

  const { pathname, search } = req.nextUrl;

  // Root renders the support page (internal rewrite, so the URL stays clean).
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/support";
    return NextResponse.rewrite(url);
  }

  // /support on this host is the same page as its root.
  if (pathname === "/support" || pathname === "/support/") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url, 308);
  }

  // Everything else belongs to the main app.
  return NextResponse.redirect(`${CANONICAL_ORIGIN}${pathname}${search}`, 308);
}

export const config = {
  // Page routes only: API calls, Next assets, and files with an extension
  // (favicon, images, manifest) must keep working on the support host.
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
