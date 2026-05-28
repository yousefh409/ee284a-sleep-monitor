import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = (await request.json()) as { password?: string };
  if (password !== process.env.DASHBOARD_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", process.env.SESSION_SECRET ?? "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
