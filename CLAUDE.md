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

- Read `ROADMAP.md` first — it tracks known bugs (e.g. `npm run build`
  currently fails on a Windows checkout, see that file). Don't rediscover these from scratch.
- Preserve the existing data-source and attribution conventions in `README.md`.
- Do not commit scraped personal data or generated output unless the repository already tracks it.
