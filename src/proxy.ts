import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Fast, edge-safe gate: redirect to /login when no session cookie is present,
// so protected pages don't even begin rendering for signed-out visitors.
// Cryptographic verification of the token stays in the (app) layout
// (getCurrentUser), which runs in the Node runtime and is authoritative for
// tampered or expired cookies.
const COOKIE_NAME = "crm_session";

export function proxy(req: NextRequest) {
  if (req.cookies.has(COOKIE_NAME)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except the login page, Next internals, and static files.
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
