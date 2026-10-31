export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
const fail = (e, status = 500) => NextResponse.json({ error: e.message || String(e) }, { status: e.status || status });
import { doFetch } from "@/lib/pipeline.js";

export async function POST(req) {
  try {
    const { title, url, pastedText, slug } = await req.json();
    return NextResponse.json(await doFetch({ title, url, pastedText, slug }));
  } catch (e) { return fail(e, 400); }
}
