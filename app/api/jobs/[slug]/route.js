export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
const fail = (e, status = 500) => NextResponse.json({ error: e.message || String(e) }, { status: e.status || status });
import { deleteJob } from "@/lib/pipeline.js";

export async function DELETE(_req, { params }) {
  try { deleteJob(params.slug); return NextResponse.json({ ok: true }); }
  catch (e) { return fail(e, 400); }
}
