export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
const fail = (e, status = 500) => NextResponse.json({ error: e.message || String(e) }, { status: e.status || status });
import crypto from "node:crypto";

export async function POST(req) {
  const pw = process.env.UI_PASSWORD;
  if (!pw) return NextResponse.json({ ok: true });
  const { password } = await req.json();
  const a = Buffer.from(String(password || "")), b = Buffer.from(pw);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return fail(new Error("Wrong password"), 401);
  const token = crypto.createHash("sha256").update("bp:" + pw).digest("hex");
  const res = NextResponse.json({ ok: true });
  res.cookies.set("bp_auth", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14 });
  return res;
}
