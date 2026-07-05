import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, passcodeHash } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const passcode = process.env.PASSCODE;
  // No passcode configured — leave the site open (local dev convenience).
  if (!passcode) return NextResponse.next();

  if (request.nextUrl.pathname === "/login") return NextResponse.next();

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (cookie && cookie === (await passcodeHash(passcode))) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)).*)"],
};
