import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC = new Set(["/login", "/api/login"]);

export function proxy(request: NextRequest) {
  if (PUBLIC.has(request.nextUrl.pathname)) return NextResponse.next();
  const session = request.cookies.get("session")?.value;
  if (session === process.env.SESSION_SECRET) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
