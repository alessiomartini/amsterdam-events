# Claude Code instructions

## Project

TypeScript data pipeline and website for Amsterdam events. Keep scraping,
data transformation, and site generation separate.

## Verification

- Install dependencies with `npm ci` when needed.
- Run `npm run typecheck` after TypeScript changes.
- Run `npm test` after changing scrapers, builders, or tests.
- Run `npm run scrape` then `npm run build` when validating the generated site.
- Preview the generated `web` directory with `npm run dev` when changing UI.

## Workflow

- Explore the relevant scraper, schema, fixture, and generated-data path before editing.
- Read `FUTURE-ARCHITECTURE.md` first — it tracks known bugs (e.g. `npm run build`
  currently fails on a Windows checkout, see that file) and an undecided idea about
  a notes/feedback widget. Don't rediscover these from scratch.
- Prefer focused tests and small changes; do not commit secrets or scraped personal data.
- Preserve the existing data-source and attribution conventions in `README.md`.
- Before committing, inspect `git diff`, report the verification commands and results,
  and avoid committing generated output unless the repository already tracks it.
- This project has no notes/feedback backend today. Don't add one without discussing
  the approach first — see the "Feedback centralizzato" section of
  `FUTURE-ARCHITECTURE.md` for the two options under consideration.
