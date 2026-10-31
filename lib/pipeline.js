// Stages:  fetch -> (human reads source) -> approve -> generate
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as cheerio from "cheerio";
import { slugify } from "./util.js";
import { STRATEGY_SYSTEM, strategyPrompt, writerSystem, writerPrompt } from "./prompts.js";
import { llm } from "./llm.js";
import { validateArticle, validateRendered, collectTexts } from "./validate.js";
import { renderPost } from "./render.js";
import { WORK, OUT, TEMPLATE, FACTS, jobDir, outFile, checkSlug } from "./paths.js";

const MIN_SOURCE_CHARS = 3000;
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
const readText = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null);

// ---------- fetch: ONLY the one URL you give it. No crawling, no SERP, no following links ----------
function extract(html) {
  const $ = cheerio.load(html);
  $("script,style,noscript,template,iframe,svg,nav,footer,form,aside").remove();
  $('[hidden],[aria-hidden="true"]').remove();
  $("*").each((_, el) => {
    const st = ($(el).attr("style") || "").replace(/\s/g, "").toLowerCase();
    if (/display:none|visibility:hidden|font-size:0|opacity:0/.test(st)) $(el).remove();
  });
  const pick = ["article", "main", "body"].map((s) => $(s).first()).find((x) => x.length) || $.root();
  const lines = [];
  pick.find("h1,h2,h3,h4,p,li,td,th").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (!t) return;
    lines.push(/^h\d$/i.test(el.tagName) ? `## ${t}` : t);
  });
  return lines.filter((l, i) => l !== lines[i - 1]).join("\n");
}

function analyse(text) {
  const headings = text.split("\n").filter((l) => l.startsWith("## "));
  const words = text.split(/\s+/).filter(Boolean).length;
  const warning = text.length < MIN_SOURCE_CHARS || headings.length < 3
    ? `Looks empty or blocked (${text.length} chars, ${headings.length} headings). Likely JS-rendered. Paste the text manually.`
    : undefined;
  return { chars: text.length, words, headings, warning };
}

function writeSource(slug, text, meta) {
  const dir = jobDir(slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "source.txt"), text);
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2));
  fs.rmSync(path.join(dir, "APPROVED"), { force: true }); // any new source must be re-approved
}

export async function doFetch({ title, url, pastedText, slug: slugIn }) {
  title = String(title || "").trim();
  if (!title) throw new Error("title is required");
  const slug = checkSlug(slugIn || slugify(title));
  let text, via;
  if (pastedText && pastedText.trim()) {
    text = pastedText.trim(); via = "file";
  } else {
    if (!url) throw new Error("Provide a URL or paste the article text");
    let u; try { u = new URL(url); } catch { throw new Error("That URL is not valid"); }
    if (!/^https?:$/.test(u.protocol)) throw new Error("Only http(s) URLs are allowed");
    const res = await fetch(u, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; ContentResearch/1.0)" },
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
    text = extract(await res.text()); via = "url";
  }
  writeSource(slug, text, { slug, title, url: url || null, via, fetchedAt: new Date().toISOString() });
  return { slug, ...analyse(text), preview: text.slice(0, 1200) };
}

// Human edits the source on the review step (e.g. fixing a blocked page). Needs re-approval.
export function saveSource(slug, text) {
  const meta = readJson(path.join(jobDir(slug), "meta.json"));
  if (!meta) throw new Error("job not found");
  writeSource(slug, String(text), { ...meta, via: "file", editedAt: new Date().toISOString() });
  return analyse(String(text));
}

export function doApprove(slug) {
  const src = path.join(jobDir(slug), "source.txt");
  if (!fs.existsSync(src)) throw new Error("nothing to approve; fetch first");
  fs.writeFileSync(path.join(jobDir(slug), "APPROVED"), sha(fs.readFileSync(src, "utf8")));
  return { slug, approved: true };
}

export async function doGenerate({ slug, overwrite = false, log = () => {} }) {
  const dir = jobDir(slug);
  const src = path.join(dir, "source.txt");
  const appr = path.join(dir, "APPROVED");
  if (!fs.existsSync(src) || !fs.existsSync(appr)) throw new Error("source not approved");
  const sourceText = fs.readFileSync(src, "utf8");
  if (fs.readFileSync(appr, "utf8").trim() !== sha(sourceText)) throw new Error("source changed after approval; re-approve it");

  const dest = outFile(slug);
  if (fs.existsSync(dest) && !overwrite) throw new Error("Output already exists. Tick 'overwrite' to replace it.");
  if (!fs.existsSync(TEMPLATE)) throw new Error("template.html missing. Upload a template first (Template page).");
  if (!fs.existsSync(FACTS)) throw new Error("fact-sheet.md missing. Create it on the Fact Sheet page.");

  const meta = readJson(path.join(dir, "meta.json"));
  const factSheet = fs.readFileSync(FACTS, "utf8");

  log("1/3  Building keyword strategy…");
  const strategy = await llm({ system: STRATEGY_SYSTEM, user: strategyPrompt({ topic: meta.title, source: sourceText }), temperature: 0.4 });
  if (!Array.isArray(strategy?.outline) || strategy.outline.length < 6) throw new Error("strategy step returned no usable outline");
  fs.writeFileSync(path.join(dir, "strategy.json"), JSON.stringify(strategy, null, 2));

  log("2/3  Writing article (up to 3 attempts)…");
  let article, report, feedback = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    log(`     Attempt ${attempt}/3…`);
    article = await llm({ system: writerSystem(), user: writerPrompt({ topic: meta.title, strategy, factSheet, source: sourceText, feedback }), temperature: 0.8 });
    report = validateArticle(article, { sourceText });
    if (!report.errors.length) { log("     ✓ Passed validation"); break; }
    log(`     ✗ ${report.errors.length} validation error(s); retrying`);
    feedback = report.errors.join("\n- ");
  }
  if (report.errors.length) {
    fs.writeFileSync(path.join(dir, "article.rejected.json"), JSON.stringify({ article, report }, null, 2));
    throw new Error("Rejected after 3 attempts:\n- " + report.errors.join("\n- "));
  }
  fs.writeFileSync(path.join(dir, "article.json"), JSON.stringify(article, null, 2));

  log("3/3  Rendering HTML…");
  const html = renderPost(fs.readFileSync(TEMPLATE, "utf8"), article, slug);
  const renderErrs = validateRendered(html, article);
  if (renderErrs.length) throw new Error("Rendered page failed checks:\n- " + renderErrs.join("\n- "));

  const warnings = [...report.warnings];
  if (process.env.SITE_ROOT && !fs.existsSync(path.join(process.env.SITE_ROOT, "assets", "blogs", slug, "hero-image.webp")))
    warnings.push(`og:image target missing: assets/blogs/${slug}/hero-image.webp`);

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest + ".tmp", html);
  fs.renameSync(dest + ".tmp", dest);

  const review = `# Review: ${article.title}
Output: ${dest}
Words: ${report.stats.words}   Verbatim overlap with source: ${(report.stats.similarity * 100).toFixed(1)}%
Primary keyword: ${article.primaryKeyword}
Secondary: ${(article.secondaryKeywords || []).join(", ")}

## Warnings
${warnings.map((w) => "- " + w).join("\n") || "- none"}

## Facts a human must verify before publishing
${(article.factsToVerify || []).map((f) => "- [ ] " + f).join("\n") || "- (none listed; still check every number and section reference)"}

## Left as-is in the template (not touched by the pipeline)
- Hero image block (still points at the template's original image), "Also Read" sidebar, CTA, header/footer.
`;
  fs.writeFileSync(path.join(dir, "review.md"), review);
  log(`\n✓ Draft written (${warnings.length} warning(s))`);
  return { slug, stats: report.stats, warnings };
}

// ---------- job reads ----------
export function getJob(slug, { full = false } = {}) {
  const dir = jobDir(slug);
  const meta = readJson(path.join(dir, "meta.json"));
  if (!meta) return null;
  const approved = fs.existsSync(path.join(dir, "APPROVED"));
  const article = readJson(path.join(dir, "article.json"));
  const hasOut = fs.existsSync(outFile(slug));
  const source = readText(path.join(dir, "source.txt"));
  let words = null;
  if (article) { try { words = collectTexts(article).join(" ").split(/\s+/).filter(Boolean).length; } catch {} }
  // furthest step reached: 1 fetched, 2 approved, 3 generated/published
  const status = hasOut ? "done" : approved ? "approved" : "fetched";
  const job = { slug, title: meta.title, url: meta.url, via: meta.via, fetchedAt: meta.fetchedAt, status, approved, hasOut, words,
    hasArticle: !!article, sourceStats: source ? analyse(source) : null };
  if (full) Object.assign(job, { source, article, strategy: readJson(path.join(dir, "strategy.json")), review: readText(path.join(dir, "review.md")) });
  return job;
}

export function listJobs() {
  if (!fs.existsSync(WORK)) return [];
  return fs.readdirSync(WORK, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => { try { return getJob(d.name); } catch { return null; } })
    .filter(Boolean)
    .sort((a, b) => new Date(b.fetchedAt) - new Date(a.fetchedAt));
}

export function deleteJob(slug) {
  fs.rmSync(jobDir(slug), { recursive: true, force: true }); // output in out/ is kept on purpose
}
