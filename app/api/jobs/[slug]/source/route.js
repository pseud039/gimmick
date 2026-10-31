export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
const fail = (e, status = 500) => NextResponse.json({ error: e.message || String(e) }, { status: e.status || status });
import { saveSource } from "@/lib/pipeline.js";

export async function PUT(req, { params }) {
  try {
    const { text } = await req.json();
    if (typeof text !== "string" || !text.trim()) return fail(new Error("text is required"), 400);
    return NextResponse.json(saveSource(params.slug, text));
  } catch (e) { return fail(e, 400); }
}
