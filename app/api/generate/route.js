export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
const fail = (e, status = 500) => NextResponse.json({ error: e.message || String(e) }, { status: e.status || status });
import { startGeneration } from "@/lib/generation.js";
import { checkSlug } from "@/lib/paths.js";

export async function POST(req) {
  try {
    const { slug, overwrite } = await req.json();
    startGeneration(checkSlug(slug), !!overwrite);
    return NextResponse.json({ slug, started: true });
  } catch (e) { return fail(e, 400); }
}
