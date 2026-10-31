export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import fs from "node:fs";
import * as cheerio from "cheerio";
import { outFile } from "@/lib/paths.js";

const SITE_URL = process.env.SITE_URL || "https://billingsoftwareindia.in";

export async function GET(_req, { params }) {
  try {
    const f = outFile(params.slug);
    if (!fs.existsSync(f))
      return new Response("No output yet for this slug", { status: 404 });

    const raw = fs.readFileSync(f, "utf8");
    const $ = cheerio.load(raw);

    // 1. Inject a <base> tag so relative paths (CSS, images, fonts) resolve
    //    against the live production site instead of localhost.
    const base = `${SITE_URL}/blogs/${params.slug}/`;
    $("head").prepend(`<base href="${base}" />`);

    // 2. Remove the inline script that calls LoadHTML() — it fetches
    //    ../../services/header.html & footer.html, which on localhost resolves
    //    to a Next.js 404 page and injects the app's own sidebar into the preview.
    $("script").each((_, el) => {
      const src = $(el).attr("src") || "";
      const content = $(el).html() || "";
      // Remove any script that loads the site header/footer or references form.min.js
      if (
        content.includes("LoadHTML") ||
        content.includes("header.html") ||
        content.includes("footer.html") ||
        src.includes("form.min.js")
      ) {
        $(el).remove();
      }
    });

    // 3. Remove the now-empty header/footer placeholder divs to keep layout clean.
    $("#header").remove();
    $("#footer").remove();

    // 4. Inject a small preview banner so it's clear this is a local preview.
    $("body").prepend(`
      <div style="
        position:sticky;top:0;z-index:9999;
        background:#1a2030;color:#e2e8f4;
        font:600 13px/1 system-ui,sans-serif;
        padding:9px 20px;display:flex;align-items:center;gap:14px;
        border-bottom:1px solid #252d3d;
      ">
        <span style="background:#5b9cf6;color:#050d1a;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:700;letter-spacing:.04em;">PREVIEW</span>
        <span style="color:#7a8499;">${params.slug}</span>
        <span style="margin-left:auto;color:#7a8499;font-weight:400;">Header &amp; footer hidden in preview</span>
      </div>
    `);

    const html = $.html();
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    return new Response(e.message, { status: 400 });
  }
}
