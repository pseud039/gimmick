export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
const fail = (e, status = 500) => NextResponse.json({ error: e.message || String(e) }, { status: e.status || status });
import fs from "node:fs";
import { FACTS } from "@/lib/paths.js";

export async function GET() {
  return NextResponse.json({ content: fs.existsSync(FACTS) ? fs.readFileSync(FACTS, "utf8") : "" });
}
export async function PUT(req) {
  try {
    const { content } = await req.json();
    if (typeof content !== "string") return fail(new Error("content must be a string"), 400);
    fs.writeFileSync(FACTS, content, "utf8");
    return NextResponse.json({ ok: true, chars: content.length });
  } catch (e) { return fail(e); }
}
