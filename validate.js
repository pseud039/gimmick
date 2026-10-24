import { SUFFIX } from "./lib.js";

const TYPES = new Set(["p", "h4", "ul", "table"]);
const BAD = /[<>]|https?:\/\/|www\./i; // model output must be plain text: no tags, no links
const LIMITS = { simWarn: 0.03, simFail: 0.08, ngram: 7 };

const words = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
const str = (s, min = 1) => typeof s === "string" && s.trim().length >= min;

export function collectTexts(a) {
  const t = [a.title, a.seoTitle, a.metaDescription, ...(a.intro || [])];
  for (const s of a.sections || []) {
    t.push(s.heading);
    for (const b of s.blocks || []) {
      if (b.type === "p" || b.type === "h4") t.push(b.text);
      if (b.type === "ul") t.push(...(b.items || []));
      if (b.type === "table") t.push(...(b.headers || []), ...(b.rows || []).flat());
    }
  }
  for (const f of a.faqs || []) t.push(f.question, f.answer);
  return t.filter((x) => typeof x === "string");
}

export function overlap(texts, sourceText, n = LIMITS.ngram) {
  const sw = words(sourceText);
  const src = new Set();
  for (let i = 0; i + n <= sw.length; i++) src.add(sw.slice(i, i + n).join(" "));
  let total = 0, hit = 0;
  for (const t of texts) {
    const w = words(t);
    for (let i = 0; i + n <= w.length; i++) {
      total++;
      if (src.has(w.slice(i, i + n).join(" "))) hit++;
    }
  }
  return total ? hit / total : 0;
}

export function validateArticle(a, { sourceText = "" } = {}) {
  const errors = [], warnings = [];
  const err = (m) => errors.push(m), warn = (m) => warnings.push(m);
  if (!a || typeof a !== "object") return { errors: ["output is not a JSON object"], warnings, stats: {} };

  // --- head fields
  if (!str(a.title, 20) || a.title.length > 95) err("title must be 20-95 chars");
  if (!str(a.seoTitle, 15)) err("seoTitle missing");
  else {
    const full = a.seoTitle.length + SUFFIX.length;
    if (full > 75) err(`seoTitle + brand suffix is ${full} chars (max 75); shorten seoTitle to <= ${75 - SUFFIX.length}`);
    else if (full > 65) warn(`title tag is ${full} chars; Google may truncate past ~60-65`);
  }
  if (!str(a.metaDescription, 70) || a.metaDescription.length > 165) err("metaDescription must be 70-165 chars");
  else if (a.metaDescription.length > 160 || a.metaDescription.length < 120) warn(`metaDescription is ${a.metaDescription.length} chars (ideal 120-160)`);

  const pk = str(a.primaryKeyword, 3) ? a.primaryKeyword.toLowerCase() : null;
  if (!pk) err("primaryKeyword missing");
  if (!Array.isArray(a.secondaryKeywords) || a.secondaryKeywords.length < 5 || a.secondaryKeywords.length > 15) err("secondaryKeywords must be 5-15 items");
  if (pk) {
    if (!a.seoTitle?.toLowerCase().includes(pk)) warn("primary keyword not in seoTitle");
    if (!a.metaDescription?.toLowerCase().includes(pk)) warn("primary keyword not in metaDescription");
    if (!a.intro?.[0]?.toLowerCase().includes(pk)) warn("primary keyword not in first intro paragraph");
  }

  // --- intro
  if (!Array.isArray(a.intro) || a.intro.length < 3 || a.intro.length > 6) err("intro must have 3-6 paragraphs");
  else a.intro.forEach((p, i) => { if (!str(p, 60)) err(`intro[${i}] too short`); });

  // --- sections
  const heads = new Set();
  if (!Array.isArray(a.sections) || a.sections.length < 7 || a.sections.length > 16) err("sections must be 7-16");
  else {
    let tables = 0, lists = 0;
    a.sections.forEach((s, i) => {
      const L = `sections[${i}]`;
      if (!str(s?.heading, 10) || s.heading.length > 100) { err(`${L}.heading must be 10-100 chars`); return; }
      const key = s.heading.toLowerCase();
      if (heads.has(key)) err(`${L}.heading duplicated`);
      heads.add(key);
      if (!Array.isArray(s.blocks) || s.blocks.length < 2) { err(`${L} needs >= 2 blocks`); return; }
      s.blocks.forEach((b, j) => {
        const B = `${L}.blocks[${j}]`;
        if (!b || !TYPES.has(b.type)) return err(`${B} has invalid type`);
        if (b.type === "p" || b.type === "h4") { if (!str(b.text, b.type === "p" ? 40 : 5)) err(`${B}.text too short`); }
        if (b.type === "ul") {
          lists++;
          if (!Array.isArray(b.items) || b.items.length < 3 || b.items.length > 12 || !b.items.every((x) => str(x, 3))) err(`${B} ul needs 3-12 non-empty items`);
        }
        if (b.type === "table") {
          tables++;
          const ok = Array.isArray(b.headers) && b.headers.length >= 2 && b.headers.length <= 6 && Array.isArray(b.rows) && b.rows.length >= 2 && b.rows.length <= 10
            && b.rows.every((r) => Array.isArray(r) && r.length === b.headers.length && r.every((c) => str(c, 1)));
          if (!ok) err(`${B} table must have 2-6 headers, 2-10 rectangular rows`);
        }
      });
    });
    if (tables < 1) warn("no table in article");
    if (lists < 2) warn("fewer than 2 lists");
    if (pk && [...heads].filter((h) => h.includes(pk)).length < 1) warn("primary keyword in no section heading");
  }

  // --- FAQ
  if (!Array.isArray(a.faqs) || a.faqs.length < 6 || a.faqs.length > 10) err("faqs must be 6-10");
  else a.faqs.forEach((f, i) => {
    if (!str(f?.question, 10)) err(`faqs[${i}].question too short`);
    else if (!f.question.trim().endsWith("?")) warn(`faqs[${i}] question has no '?'`);
    if (!str(f?.answer, 60) || f.answer.length > 700) err(`faqs[${i}].answer must be 60-700 chars`);
  });

  // --- plain-text hygiene (also the prompt-injection backstop: no links, no tags)
  const texts = collectTexts(a);
  texts.forEach((t) => {
    if (BAD.test(t)) err(`disallowed markup/link in: "${t.slice(0, 60)}..."`);
    if ((t.match(/\*\*/g) || []).length % 2) err(`unbalanced ** in: "${t.slice(0, 60)}..."`);
  });

  // --- length, product mentions, verification list
  const wc = texts.reduce((n, t) => n + words(t).length, 0);
  if (wc < 900) err(`only ${wc} words (min 900)`);
  else if (wc < 1500) warn(`${wc} words; target 1800+`);
  else if (wc > 3500) warn(`${wc} words; very long`);
  const brand = texts.join(" ").match(/hitech\s*billsoft/gi)?.length || 0;
  if (brand > 8) err(`brand mentioned ${brand} times (max 8)`);
  else if (brand > 5) warn(`brand mentioned ${brand} times`);
  if (!Array.isArray(a.factsToVerify)) err("factsToVerify must be an array");
  else if (!a.factsToVerify.length) warn("factsToVerify is empty; GST content almost always has claims to check");

  // --- similarity to the provided source
  let sim = 0;
  if (sourceText) {
    sim = overlap(texts, sourceText);
    if (sim >= LIMITS.simFail) err(`${(sim * 100).toFixed(1)}% of ${LIMITS.ngram}-word phrases appear verbatim in the source (limit ${LIMITS.simFail * 100}%)`);
    else if (sim >= LIMITS.simWarn) warn(`${(sim * 100).toFixed(1)}% verbatim phrase overlap with source`);
  }
  return { errors, warnings, stats: { words: wc, similarity: sim, brand } };
}

// Checks on the final HTML: the "href <-> id" contract and FAQ wiring.
export function validateRendered(html, a) {
  const errors = [];
  if (/\{\{[A-Z_]+\}\}/.test(html)) errors.push("unfilled {{PLACEHOLDER}} left in output");

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
  if (dup.length) errors.push(`duplicate ids: ${dup.join(", ")}`);
  if (!ids.includes("faq")) errors.push('#faq anchor target missing (id="faq")');

  const h3 = [...html.matchAll(/<h3 class="my-5" id="([^"]+)">/g)].map((m) => m[1]);
  const toc = html.match(/list-pointer-soft-bg-primary">([\s\S]*?)<\/ul>/);
  const hrefs = toc ? [...toc[1].matchAll(/href="#([^"]+)"/g)].map((m) => m[1]) : [];
  if (!toc) errors.push("TOC not found");
  if (h3.length !== a.sections.length) errors.push(`rendered ${h3.length} section headings, expected ${a.sections.length}`);
  for (const id of h3) if (!hrefs.includes(id)) errors.push(`heading #${id} has no TOC link`);
  for (const href of hrefs) if (href !== "faq" && !h3.includes(href)) errors.push(`TOC link #${href} has no matching heading`);

  const faqIds = ids.filter((x) => /^faq\d+$/.test(x));
  const targets = [...html.matchAll(/data-bs-target="#(faq\d+)"/g)].map((m) => m[1]);
  if (faqIds.length !== a.faqs.length || targets.length !== a.faqs.length) errors.push("FAQ item count / ids mismatch");
  if (faqIds.some((x) => !targets.includes(x))) errors.push("FAQ button target does not match panel id");
  if ((html.match(/accordion-collapse collapse show/g) || []).length !== 1) errors.push("exactly one FAQ panel should be open");
  return errors;
}
