#!/usr/bin/env node
// Stages:  fetch -> (human reads work/<slug>/source.txt) -> approve -> generate
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parseArgs } from "node:util";
import * as cheerio from "cheerio";
import { slugify, isValidSlug } from "./lib.js";
import { STRATEGY_SYSTEM, strategyPrompt, WRITER_SYSTEM, writerPrompt } from "./prompts.js";
import 'dotenv/config'   // loads .env before anything else  
import { gemini } from "./gemini.js";
import { validateArticle, validateRendered } from "./validate.js";
import { renderPost } from "./render.js";

const WORK = process.env.WORK_DIR || "work";
const OUT = process.env.OUT_DIR || "out";
const SITE_ROOT = process.env.SITE_ROOT; // optional: your site repo root, to check the hero image exists
const MIN_SOURCE_CHARS = 3000;

const { values: v, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    slug: { type: "string" }, title: { type: "string" }, url: { type: "string" },
    file: { type: "string" }, overwrite: { type: "boolean" },
  },
});
const stage = positionals[0];
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const die = (m) => { console.error("\n" + m); process.exit(1); };

const slug = v.slug || (v.title ? slugify(v.title) : "");
if (!["fetch", "approve", "generate"].includes(stage)) die("usage: node run.js <fetch|approve|generate> --slug <slug> [--title ... --url ... | --file pasted.txt]");
if (!isValidSlug(slug)) die("provide --slug (a-z, 0-9, hyphens) or --title");
const dir = path.join(WORK, slug);
const P = (f) => path.join(dir, f);

// ---------- fetch: ONLY the one URL you give it. No crawling, no SERP, no following links ----------
function extract(html) {
  const $ = cheerio.load(html);
  $("script,style,noscript,template,iframe,svg,nav,footer,form,aside").remove();
  $('[hidden],[aria-hidden="true"]').remove();
  $("*").each((_, el) => {
    const st = ($(el).attr("style") || "").replace(/\s/g, "").toLowerCase();
    if (/display:none|visibility:hidden|font-size:0|opacity:0/.test(st)) $(el).remove();
  });
  const root = $("article").first().length ? $("article").first() : $("main").first().length ? $("main").first() : $("body");
  const lines = [];
  root.find("h1,h2,h3,h4,p,li,td,th").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (!t) return;
    const tag = el.tagName.toLowerCase();
    lines.push(/^h\d$/.test(tag) ? `## ${t}` : t);
  });
  return lines.filter((l, i) => l !== lines[i - 1]).join("\n");
}

async function doFetch() {
  if (!v.title) die("--title is required (the target post title)");
  let text, via;
  if (v.file) { text = fs.readFileSync(v.file, "utf8"); via = "file"; }
  else {
    if (!v.url) die("--url or --file is required");
    const res = await fetch(v.url, { headers: { "user-agent": "Mozilla/5.0 (compatible; ContentResearch/1.0)" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
    if (!res.ok) die(`fetch failed: HTTP ${res.status}. Save the article text yourself and use --file.`);
    text = extract(await res.text());
    via = "url";
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(P("source.txt"), text);
  fs.writeFileSync(P("meta.json"), JSON.stringify({ slug, title: v.title, url: v.url || null, via, fetchedAt: new Date().toISOString() }, null, 2));
  fs.rmSync(P("APPROVED"), { force: true }); // a new fetch always needs a new approval

  const heads = text.split("\n").filter((l) => l.startsWith("## "));
  console.log(`\n=== SOURCE PREVIEW: ${slug} ===`);
  console.log(`chars: ${text.length}   words: ${text.split(/\s+/).length}   headings: ${heads.length}`);
  console.log(heads.slice(0, 25).join("\n") || "(no headings found)");
  console.log("\nfirst 700 chars:\n" + text.slice(0, 700));
  if (text.length < MIN_SOURCE_CHARS || heads.length < 3)
    console.log(`\n!! LOOKS EMPTY OR BLOCKED (under ${MIN_SOURCE_CHARS} chars or < 3 headings). Likely JS-rendered or bot-blocked. Do NOT approve; paste the article into a .txt and re-run fetch with --file.`);
  console.log(`\nRead ${P("source.txt")}. If it is the full article, run:\n  node run.js approve --slug ${slug}`);
}

// ---------- approve: human gate. Approval is bound to the exact text hash ----------
function doApprove() {
  if (!fs.existsSync(P("source.txt"))) die("nothing to approve; run fetch first");
  fs.writeFileSync(P("APPROVED"), sha(fs.readFileSync(P("source.txt"), "utf8")));
  console.log(`approved. Now: node run.js generate --slug ${slug}`);
}

// ---------- generate ----------
async function doGenerate() {
  if (!fs.existsSync(P("source.txt")) || !fs.existsSync(P("APPROVED"))) die("source not approved. Run fetch, read it, then approve.");
  const sourceText = fs.readFileSync(P("source.txt"), "utf8");
  if (fs.readFileSync(P("APPROVED"), "utf8").trim() !== sha(sourceText)) die("source.txt changed after approval. Re-run approve.");

  const dest = path.join(OUT, "blogs", slug, "index.html");
  if (fs.existsSync(dest) && !v.overwrite) die(`${dest} already exists (use --overwrite). Refusing to clobber an existing post.`);
  if (!fs.existsSync("template.html")) die("template.html missing. Run: node make-template.js original.html template.html");

  const meta = JSON.parse(fs.readFileSync(P("meta.json"), "utf8"));
  const factSheet = fs.readFileSync("fact-sheet.md", "utf8");

  console.log("1/3 strategy...");
  const strategy = await gemini({ system: STRATEGY_SYSTEM, user: strategyPrompt({ topic: meta.title, source: sourceText }), temperature: 0.4 });
  if (!Array.isArray(strategy?.outline) || strategy.outline.length < 6) die("strategy step returned no usable outline; aborting (nothing written).");
  fs.writeFileSync(P("strategy.json"), JSON.stringify(strategy, null, 2));

  console.log("2/3 writing + validating...");
  let article, report, feedback = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    article = await gemini({ system: WRITER_SYSTEM, user: writerPrompt({ topic: meta.title, strategy, factSheet, source: sourceText, feedback }), temperature: 0.8 });
    report = validateArticle(article, { sourceText });
    if (!report.errors.length) break;
    console.log(`  attempt ${attempt} failed (${report.errors.length} errors)`);
    feedback = report.errors.join("\n- ");
  }
  if (report.errors.length) {
    fs.writeFileSync(P("article.rejected.json"), JSON.stringify({ article, report }, null, 2));
    die(`Rejected after 3 attempts. Nothing published. See ${P("article.rejected.json")}\n- ` + report.errors.join("\n- "));
  }
  fs.writeFileSync(P("article.json"), JSON.stringify(article, null, 2));

  console.log("3/3 rendering...");
  const html = renderPost(fs.readFileSync("template.html", "utf8"), article, slug);
  const renderErrs = validateRendered(html, article);
  if (renderErrs.length) die("Rendered page failed checks, nothing written:\n- " + renderErrs.join("\n- "));

  const warnings = [...report.warnings];
  if (SITE_ROOT && !fs.existsSync(path.join(SITE_ROOT, "assets", "blogs", slug, "hero-image.webp")))
    warnings.push(`og:image target missing: assets/blogs/${slug}/hero-image.webp`);

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest + ".tmp", html);
  fs.renameSync(dest + ".tmp", dest); // only appears on full success

  const review = `# Review: ${article.title}
Output: ${dest}
Words: ${report.stats.words}   Verbatim overlap with source: ${(report.stats.similarity * 100).toFixed(1)}%
Primary keyword: ${article.primaryKeyword}
Secondary: ${article.secondaryKeywords.join(", ")}

## Warnings
${warnings.map((w) => "- " + w).join("\n") || "- none"}

## Facts a human must verify before publishing
${article.factsToVerify.map((f) => "- [ ] " + f).join("\n") || "- (none listed; still check every number and section reference)"}

## Left as-is in the template (not touched by the pipeline)
- Hero image block (still points at the template's original image), "Also Read" sidebar, CTA, header/footer.
`;
  fs.writeFileSync(P("review.md"), review);
  console.log(`\nDRAFT written: ${dest}\nReview checklist: ${P("review.md")}\n${warnings.length} warning(s).`);
}

Promise.resolve().then(() => ({ fetch: doFetch, approve: doApprove, generate: doGenerate })[stage]()).catch((e) => die(e.stack || String(e)));
