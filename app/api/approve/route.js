export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
const fail = (e, status = 500) => NextResponse.json({ error: e.message || String(e) }, { status: e.status || status });
import { doApprove } from "@/lib/pipeline.js";

export async function POST(req) {
  try { return NextResponse.json(doApprove((await req.json()).slug)); }
  catch (e) { return fail(e, 400); }
}
