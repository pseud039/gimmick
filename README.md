# Blog Pipeline

An internal Next.js UI for turning one competitor or sample article into an
original SEO blog post in a frozen HTML template.

The pipeline does not crawl the web or search SERPs. It uses only the one
source supplied for a job, the product fact sheet, and the configured LLM.
The LLM returns JSON; the application validates the JSON and builds the final
HTML.

## Run locally

Requirements: Node.js `>=18.18`.

```bash
npm install
cp .env.example .env
npm run dev
```

Open <http://localhost:3000>. For production:

```bash
npm run build
npm start
```

The Settings page can update the editable `.env` values while the app is
running. Set `UI_PASSWORD` in `.env` to password-protect the UI.

## Current flow

### 0. Configure the inputs

Before generating a post, use the configuration pages:

1. **Template** (`/template`): upload or paste the published HTML page to
   preserve. The template contains placeholders such as `{{H_TITLE}}`,
   `{{ARTICLE_HTML}}`, and `{{FAQ_HTML}}`; all other HTML stays frozen.
2. **Fact Sheet** (`/factsheet`): record the product capabilities and facts
   the writer is allowed to use.
3. **Settings** (`/settings`): configure the OpenRouter API key/model and
   generation limits.

Generation is blocked until the template, fact sheet, API key, and model are
available.

### 1. Create a source (`/new`)

Enter the target blog title and optional URL slug, then provide exactly one
source:

- **Fetch from URL**: fetches one `http(s)` page and extracts visible article
  headings, paragraphs, list items, and table cells.
- **Paste text**: accepts the article text directly. Use `## ` before headings
  when pasting so the source outline can be reviewed.

No crawling, SERP lookup, or following of article links is performed. A job is
saved under `work/<slug>/`.

### 2. Review and approve (`/jobs/<slug>/review`)

Review the extracted source, character/word counts, and detected headings.
If the page was blocked or incomplete, edit or replace the source text.
Saving an edit invalidates any previous approval.

Nothing is sent to the LLM until the human clicks **Approve & continue**.
Approval is tied to a hash of the exact source text, so changing the source
after approval requires approval again.

### 3. Generate (`/jobs/<slug>/generate`)

The server runs three phases and streams progress to the page:

1. **Keyword strategy**: derives the primary/secondary keywords, search
   intent, coverage gaps, outline, FAQs, and claims needing verification from
   the supplied source.
2. **Article writing**: creates the article JSON using the strategy, fact
   sheet, and source. It retries up to three times when validation fails.
3. **HTML rendering**: injects the validated article into the frozen template
   and validates placeholders, anchors, table of contents links, and FAQ
   wiring.

The generation page can be left and revisited; its live log is replayed while
the job is running. Existing output must be explicitly overwritten.

### 4. Review the result (`/jobs/<slug>/result`)

Inspect the generated draft, strategy/review information, warnings, and facts
that require human verification. The result page provides:

- A full-page preview
- A ZIP download
- The generated file at `out/blogs/<slug>/index.html`

The pipeline does not publish or deploy the file. Verify legal/product claims,
images, and the template content before publishing it to the site.

## Routes

| Route | Purpose |
|---|---|
| `/` | Dashboard of jobs and their current step |
| `/new` | Create a job from a URL or pasted source |
| `/jobs/[slug]/review` | Review/edit source and approve it |
| `/jobs/[slug]/generate` | Run or retry generation |
| `/jobs/[slug]/result` | Review, preview, and download output |
| `/template` | Upload or paste the frozen HTML template |
| `/factsheet` | Edit the product fact sheet |
| `/settings` | Edit runtime configuration |

## Configuration

The `.env.example` file contains the defaults:

```env
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=google/gemini-3-flash-preview
MAX_TOKENS=12000
TARGET_WORDS=1400
SITE_URL=https://billingsoftwareindia.in
```

`UI_PASSWORD` is optional. `WORK_DIR` and `OUT_DIR` can be used to relocate
job data and generated output.

## Data and validation

- Job input is stored in `work/<slug>/source.txt` and metadata files.
- Strategy, article JSON, and the human-readable review are stored with the
  job.
- Slugs are restricted to lowercase letters, numbers, and hyphens.
- Article output must be plain text JSON with required SEO fields, sections,
  lists, a table, FAQs, and a facts-to-verify list.
- Source overlap, unsafe markup/links, article length, and brand usage are
  checked before rendering.
- The final HTML is written atomically after template validation succeeds.
