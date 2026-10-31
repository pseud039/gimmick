export const SITE = process.env.SITE_URL || "https://billingsoftwareindia.in";
export const SUFFIX = " | Hitech Billsoft";

export function slugify(s, max = 60) {
  const base = String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base.length <= max) return base;
  const cut = base.slice(0, max);
  const i = cut.lastIndexOf("-");
  return i > 20 ? cut.slice(0, i) : cut;
}

export const isValidSlug = (s) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);

export const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Escape first, then allow only **bold**. The model never emits raw HTML.
export const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

// Ids already used on the page; section ids must never collide with these.
const RESERVED = [
  "header", "footer", "main", "faq", "faqInteriorAccordion",
  "exampleModal", "bookDemoForm", "contactWaForm", "contactWAButton",
  "contactPopover", "quickLinksToggle", "quickLinksCollapsible",
];

// Single source of truth for heading ids. TOC hrefs and <h3 id> both come from here.
export function buildIds(headings) {
  const used = new Set(RESERVED);
  return headings.map((h) => {
    const base = slugify(h, 48) || "section";
    let id = base;
    let n = 2;
    while (used.has(id) || /^faq\d*$/.test(id)) id = `${base}-${n++}`;
    used.add(id);
    return id;
  });
}
