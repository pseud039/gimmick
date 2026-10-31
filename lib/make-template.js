// One-time: turns your existing blog page into template.html by swapping ONLY the content slots
// for {{PLACEHOLDERS}}. Every anchor must match exactly once or it aborts.

/**
 * Convert an existing blog HTML page into a template with {{PLACEHOLDERS}}.
 * @param {string} html - Raw HTML string of the original page
 * @param {string} [existingSlug] - The slug that appears in the share-link URLs
 *   (auto-detected if omitted – finds the first /blogs/<slug>/ in the HTML)
 * @returns {{ template: string, placeholders: string[] }}
 */
export function convertToTemplate(html, existingSlug) {
  if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error("source already contains {{PLACEHOLDERS}}");

  // Auto-detect the slug from share links if not supplied
  const OLD = existingSlug || (() => {
    const m = html.match(/\/blogs\/([a-z0-9-]+)\//);
    if (!m) throw new Error("Could not auto-detect existing slug from the HTML. Pass it explicitly.");
    return m[1];
  })();

  let h = html;

  function once(re, fn, label) {
    const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
    const n = [...h.matchAll(new RegExp(re.source, flags))].length;
    if (n !== 1) throw new Error(`anchor "${label}" matched ${n} times (expected 1)`);
    h = h.replace(re, fn);
  }
  const attr = (re, value, label) => once(re, (m, a, b) => a + value + b, label);

  // 1. Protect the hero block (kept byte-for-byte)
  const heroMatch = h.match(/<div\s+class="border rounded-3 d-flex[\s\S]*?<\/div>/);
  if (!heroMatch || !heroMatch[0].includes("<img")) throw new Error("hero block not found");
  const hero = heroMatch[0];
  once(/<div\s+class="border rounded-3 d-flex[\s\S]*?<\/div>/, () => "@@HERO@@", "hero");

  // 2. Head
  once(/<title>[\s\S]*?<\/title>/, () => "<title>\n      {{TITLE_TAG}}\n    </title>", "title");
  attr(/(<meta\s+property="og:title"\s+content=")[^"]*(")/,   "{{TITLE_TAG}}", "og:title");
  attr(/(<meta\s+property="og:description"\s+content=")[^"]*(")/,  "{{META_DESC}}", "og:description");
  attr(/(<meta\s+name="description"\s+content=")[^"]*(")/,    "{{META_DESC}}", "meta description");
  attr(/(<meta\s+property="og:url"\s+content=")[^"]*(")/, "{{SITE}}/blogs/{{SLUG}}/", "og:url");
  attr(/(<meta\s+property="og:image"\s+content=")[^"]*(")/, "{{SITE}}/assets/blogs/{{SLUG}}/hero-image.webp", "og:image");
  attr(/(<link\s+rel="canonical"\s+href=")[^"]*(")/,          "{{SITE}}/blogs/{{SLUG}}/", "canonical");

  // 3. Page title (h2)
  once(/(<div class="col-lg mb-2 mb-lg-0">\s*<h2>)[\s\S]*?(<\/h2>)/, (m, a, b) => `${a}\n              {{H_TITLE}}\n            ${b}`, "h2 title");

  // 4. Article body (intro + TOC + sections)
  once(/(@@HERO@@)[\s\S]*?(\s*<\/div>\s*<div class="col-md-4">)/, (m, a, b) => `${a}\n\n{{ARTICLE_HTML}}${b}`, "article body");

  // 5. FAQ items
  once(
    /(<div class="accordion font-inter" id="faqInteriorAccordion">)[\s\S]*?(\s*<\/div>\s*<\/div>\s*<\/section>)/,
    (m, a, b) => `${a}\n{{FAQ_HTML}}${b}`,
    "faq items"
  );

  // 6. Remaining slug occurrences (share links) – must be exactly 2
  const left = h.split(OLD).length - 1;
  if (left !== 2) throw new Error(`expected 2 remaining slug occurrences (share links), found ${left}. Pass the correct existingSlug.`);
  h = h.split(OLD).join("{{SLUG}}");

  // 7. Restore hero untouched
  h = h.replace("@@HERO@@", () => hero);

  const placeholders = [...new Set(h.match(/\{\{[A-Z_]+\}\}/g) || [])];
  return { template: h, placeholders };
}
