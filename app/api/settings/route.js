export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
const fail = (e, status = 500) => NextResponse.json({ error: e.message || String(e) }, { status: e.status || status });
import { EDITABLE, saveEnv } from "@/lib/env.js";

const mask = (k) => (k ? k.slice(0, 8) + "…" : "");
export async function GET() {
  const out = {};
  for (const k of EDITABLE) out[k] = k === "OPENROUTER_API_KEY" ? mask(process.env[k]) : process.env[k] || "";
  return NextResponse.json(out);
}
export async function PUT(req) {
  try {
    const body = await req.json();
    const save = {};
    for (const k of EDITABLE) {
      if (typeof body[k] !== "string") continue;
      const v = body[k].trim();
      if (k === "OPENROUTER_API_KEY" && (v.endsWith("…") || v === "")) continue; // never overwrite the key with its masked display
      if (/[\r\n]/.test(v)) return fail(new Error(k + " must be a single line"), 400);
      save[k] = v;
      if (v) process.env[k] = v; else delete process.env[k];
    }
    saveEnv(save);
    return NextResponse.json({ ok: true, saved: Object.keys(save) });
  } catch (e) { return fail(e); }
}
