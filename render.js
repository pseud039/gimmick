import { esc, inline, buildIds, SITE, SUFFIX } from "./lib.js";

const indent = (s, n) => s.split("\n").map((l) => (l ? " ".repeat(n) + l : l)).join("\n");

function renderBlock(b) {
  switch (b.type) {
    case "p":
      return `<p>${inline(b.text)}</p>`;
    case "h4":
      return `<h4 class="my-4">${inline(b.text)}</h4>`;
    case "ul":
      return (
        `<ul class="list-checked list-checked-primary list-checked-soft-bg-primary">\n` +
        b.items.map((i) => `  <li class="list-checked-item">${inline(i)}</li>`).join("\n") +
        `\n</ul>`
      );
    case "table":
      return (
        `<div class="table-responsive my-4">\n` +
        `  <table class="table table-bordered align-middle">\n` +
        `    <thead class="table-light">\n      <tr>${b.headers.map((x) => `<th>${inline(x)}</th>`).join("")}</tr>\n    </thead>\n` +
        `    <tbody>\n${b.rows.map((r) => `      <tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("\n")}\n    </tbody>\n` +
        `  </table>\n</div>`
      );
    default:
      throw new Error(`unknown block type ${b.type}`);
  }
}

export function renderArticleHtml(a) {
  const ids = buildIds(a.sections.map((s) => s.heading));
  const intro = a.intro.map((t) => `<p>${inline(t)}</p>`).join("\n\n");
  const toc =
    `<ul class="list-pointer list-pointer-sm list-pointer-soft-bg-primary">\n` +
    a.sections.map((s, i) => `  <li class="list-pointer-item"><a href="#${ids[i]}"> ${esc(s.heading)} </a></li>`).join("\n") +
    `\n  <li class="list-pointer-item"><a href="#faq"> Frequently Asked Questions </a></li>\n</ul>`;
  const body = a.sections
    .map((s, i) => `<h3 class="my-5" id="${ids[i]}">${esc(s.heading)}</h3>\n\n` + s.blocks.map(renderBlock).join("\n\n"))
    .join("\n\n");
  return indent([intro, toc, body].join("\n\n"), 12);
}

export function renderFaqHtml(faqs) {
  return faqs
    .map((f, i) => {
      const first = i === 0;
      return indent(
        `<div class="accordion-item mt-3 rounded-3">
  <h2 class="accordion-header">
    <button class="accordion-button ${first ? "first-btn" : "collapsed"} rounded-3" type="button" data-bs-toggle="collapse" data-bs-target="#faq${i + 1}">
      ${esc(f.question)}
    </button>
  </h2>
  <div id="faq${i + 1}" class="accordion-collapse collapse${first ? " show" : ""}" data-bs-parent="#faqInteriorAccordion">
    <div class="accordion-body">
      ${esc(f.answer)}
    </div>
  </div>
</div>`,
        12
      );
    })
    .join("\n\n");
}

// Guard: every static byte of the template must survive, in order.
export function assertFrozen(template, output) {
  const parts = template.split(/\{\{[A-Z_]+\}\}/g);
  let pos = 0;
  parts.forEach((p, i) => {
    const at = output.indexOf(p, pos);
    if (at === -1 || (i === 0 && at !== 0)) throw new Error(`template drift detected near static segment #${i}`);
    pos = at + p.length;
  });
}

export function renderPost(template, a, slug, site = SITE) {
  const map = {
    TITLE_TAG: esc(a.seoTitle + SUFFIX),
    META_DESC: esc(a.metaDescription),
    SLUG: slug,
    SITE: site,
    H2_TITLE: esc(a.title),
    ARTICLE_HTML: renderArticleHtml(a),
    FAQ_HTML: renderFaqHtml(a.faqs),
  };
  const out = template.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => {
    if (!(k in map)) throw new Error(`template has unknown placeholder ${m}`);
    return map[k];
  });
  assertFrozen(template, out);
  return out;
}
