import { NextResponse } from "next/server";

// Optional password gate: only active when UI_PASSWORD is set.
export async function middleware(req) {
  const pw = process.env.UI_PASSWORD;
  if (!pw) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/auth") return NextResponse.next();
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("bp:" + pw));
  const token = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (req.cookies.get("bp_auth")?.value === token) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
