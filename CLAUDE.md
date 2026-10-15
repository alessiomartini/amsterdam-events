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

## Roadmap e progressi

Questo progetto è tracciato in https://alessiomartini.github.io/projects-overview/ tramite il file `ROADMAP.md`
nella root del repo. Mantienilo aggiornato:

- Alla fine di ogni sessione di lavoro (prima del commit finale), aggiorna `ROADMAP.md`:
  - spunta (`- [x]`) i punti completati in questa sessione;
  - aggiungi come `- [ ]` i nuovi compiti emersi, nella fase giusta (titoli `##`);
  - aggiungi in cima alla sezione `## Log` una riga `- AAAA-MM-GG: <cosa è stato fatto, in una frase>`
    (se esiste già una riga con la data di oggi, estendila invece di crearne un'altra).
- Non riscrivere né riordinare le voci esistenti senza motivo; non cancellare le voci completate.
- Se `ROADMAP.md` non esiste, crealo con le fasi `## ...`, le checkbox e una sezione `## Log`.
- Includi l'aggiornamento di `ROADMAP.md` nello stesso commit del lavoro.
