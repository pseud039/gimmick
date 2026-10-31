# Blog Pipeline (Next.js)

Competitor article → keyword/gap strategy → original SEO post → injected into your frozen blog template.
The LLM only outputs JSON; code builds the HTML, so the template never drifts.

## Run
```
npm install
cp .env.example .env     # or fill it in on the Settings page
npm run dev              # http://localhost:3000
```
Production: `npm run build && npm start`. Set `UI_PASSWORD` in `.env` to password-protect the UI.

## Pages (each step is its own route, with a Back button)
| Route | Step |
|---|---|
| `/` | Dashboard (opens each job at the right step) |
| `/new` , `/new?slug=…` | 1 Source: title + URL or pasted text (pre-filled when you come Back) |
| `/jobs/[slug]/review` | 2 Review/edit the source, approve (human gate) |
| `/jobs/[slug]/generate` | 3 Generate; live log; survives reload/Back (re-attaches to the running job) |
| `/jobs/[slug]/result` | 4 Preview, review checklist, ZIP download |
| `/template` `/factsheet` `/settings` | Config |

The step bar at the top is clickable for every step the job has already reached.

## Fixes vs. the previous version
- Slugs validated everywhere (path traversal in `/api/jobs/:slug/*` closed)
- `MAX_TOKENS` was ignored (hard-coded 8000); now honoured. `TARGET_WORDS` is read live, so Settings changes apply without restart
- Settings no longer rewrites/strips `.env` (comments, `UI_PASSWORD` preserved); empty value removes a key; masked API key can't overwrite the real one
- Auth: real cookie session instead of sending the password as a header/query token
- Editing the source now invalidates approval; re-fetch clears it too
- Pasted text no longer goes through temp files; only http(s) URLs are fetched
- Word count was wrong (joined without spaces); now counted from all article text
- Generation state lives on `globalThis` (survives dev reloads); SSE has heartbeat + replay
- Missing fact sheet / template / API key are reported before you start generating
- Paths are absolute (no more dependence on the launch directory); CLI entry points removed
