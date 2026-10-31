export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
const fail = (e, status = 500) => NextResponse.json({ error: e.message || String(e) }, { status: e.status || status });
import fs from "node:fs";
import { convertToTemplate } from "@/lib/make-template.js";
import { TEMPLATE } from "@/lib/paths.js";

export async function GET() {
  if (!fs.existsSync(TEMPLATE)) return NextResponse.json({ exists: false });
  const html = fs.readFileSync(TEMPLATE, "utf8");
  return NextResponse.json({ exists: true, size: html.length, placeholders: [...new Set(html.match(/\{\{[A-Z_]+\}\}/g) || [])] });
}

// multipart "html" file, or JSON { htmlText }
export async function POST(req) {
  try {
    let html;
    if ((req.headers.get("content-type") || "").includes("multipart/form-data")) {
      const f = (await req.formData()).get("html");
      if (f && typeof f !== "string") html = await f.text();
    } else html = (await req.json()).htmlText;
    if (!html) return fail(new Error("Upload an HTML file or send htmlText"), 400);
    const { template, placeholders } = convertToTemplate(html);
    fs.writeFileSync(TEMPLATE, template, "utf8");
    return NextResponse.json({ ok: true, placeholders, size: template.length });
  } catch (e) { return fail(e, 400); }
}
