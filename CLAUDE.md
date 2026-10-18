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
- Read `ROADMAP.md` first — it tracks known bugs (e.g. `npm run build`
  currently fails on a Windows checkout, see that file) and an undecided idea about
  a notes/feedback widget. Don't rediscover these from scratch.
- Prefer focused tests and small changes; do not commit secrets or scraped personal data.
- Preserve the existing data-source and attribution conventions in `README.md`.
- Before committing, inspect `git diff`, report the verification commands and results,
  and avoid committing generated output unless the repository already tracks it.
- This project has no notes/feedback backend today. Don't add one without discussing
  the approach first — see the "Feedback centralizzato" section of
  `ROADMAP.md` for the two options under consideration.

## Roadmap, idee e progressi

`ROADMAP.md` nella root è l'**unico** file per todo, idee, decisioni e diario del progetto
(niente `FUTURE-ARCHITECTURE.md`, `IDEE.md`, `TODO.md`). È letto da https://alessiomartini.github.io/projects-overview/.
Sezioni: `## <fase>` (checkbox, contano nella percentuale), `## Idee` (checkbox, non contano),
`## Decisioni e cose provate` (prosa: scartato/rimandato e perché, provato e annullato, limiti e bug noti), `## Log`.

- Alla fine di ogni sessione di lavoro (prima del commit finale), aggiorna `ROADMAP.md`:
  - spunta (`- [x]`) i punti completati in questa sessione;
  - aggiungi come `- [ ]` i nuovi compiti nella fase giusta, e le idee non decise in `## Idee`;
  - annota in `## Decisioni e cose provate` ciò che è stato scartato, rimandato o annullato, col perché;
  - aggiungi in cima a `## Log` una riga `- AAAA-MM-GG: <cosa è stato fatto, in una frase>`
    (se esiste già una riga con la data di oggi, estendila invece di crearne un'altra).
- Non riscrivere né riordinare le voci esistenti senza motivo; non cancellare le voci completate.
- Se `ROADMAP.md` non esiste, crealo da `templates/ROADMAP.md` di projects-overview.
- Includi l'aggiornamento di `ROADMAP.md` nello stesso commit del lavoro.
