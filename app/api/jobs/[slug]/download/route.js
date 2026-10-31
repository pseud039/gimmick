export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextResponse } from "next/server";
const fail = (e, status = 500) => NextResponse.json({ error: e.message || String(e) }, { status: e.status || status });
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { outFile } from "@/lib/paths.js";

export async function GET(_req, { params }) {
  try {
    const slug = params.slug;
    const dir = path.dirname(outFile(slug));
    if (!fs.existsSync(dir)) return fail(new Error("No output for this slug"), 404);
    const zip = new JSZip();
    const add = (p, rel) => {
      for (const e of fs.readdirSync(p, { withFileTypes: true })) {
        const full = path.join(p, e.name), r = `${rel}/${e.name}`;
        e.isDirectory() ? add(full, r) : zip.file(r, fs.readFileSync(full));
      }
    };
    add(dir, slug);
    const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    return new Response(buf, { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${slug}.zip"` } });
  } catch (e) { return fail(e); }
}
