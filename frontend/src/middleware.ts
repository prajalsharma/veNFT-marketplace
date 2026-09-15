import { NextRequest, NextResponse } from "next/server";

// support.vezo.exchange serves the same Next.js app (same Vercel project, the
// subdomain is just an extra domain on it); this rewrite makes its root render
// the /support page. Assets, API routes, and other paths pass through untouched.
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  if (host === "support.vezo.exchange" || host.startsWith("support.localhost")) {
    if (req.nextUrl.pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/support";
      return NextResponse.rewrite(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
