# Future architecture

Ideas not yet decided, and work known to be half-done or broken. Read this
before starting new work.

## Known bug: `npm run build` fails on Windows

`src/build-site.ts` builds its source/destination paths with
`new URL(..., import.meta.url).pathname`. On Windows that produces a path
with a leading slash before the drive letter (e.g. `/E:/Alessio/...`), which
Node's `fs` functions do not resolve the way `join()`/`dirname()` expect —
running `npm run build` here fails with:

```
Error: ENOENT: no such file or directory, mkdir 'E:\E:\Alessio\...\web\data'
```

This is unrelated to the dependency updates made alongside this
documentation pass (confirmed: `npm run typecheck` and `npm test` both pass
cleanly on the current dependency versions; the bug reproduces with the
pre-existing `package.json` too, since it is purely a `URL.pathname` vs.
Windows-path mismatch in `build-site.ts`, nothing to do with package
versions). It has presumably never been hit before because the project has
mainly been built on Linux (CI) or macOS. Not fixed here — the fix is a
small code change (e.g. `fileURLToPath()` from `node:url` instead of
`.pathname`), but that is a source-code change outside the scope of this
documentation/dependency pass, and it deserves its own verification on an
actual Windows checkout.

## Dependency notes

- `vitest` was bumped from `^2.1.8` to `^5.0.1` (a major-version jump) to
  close 5 vulnerabilities (`npm audit`, including one marked critical)
  reported against `@vitest/mocker`/`vite`/`esbuild` in the 2.x line — there
  was no patch-level fix available. Verified with `npm run typecheck` and
  `npm test` (58/58 passing) after the bump; `npm audit` now reports 0
  vulnerabilities.
  - The first upgrade attempt (`npm install vitest@latest` with the existing
    `package-lock.json` still present) failed with a self-contradictory
    `ERESOLVE` error (`peer vite "^6.4.0 || ^7.0.0 || ^8.0.0"` reported as
    conflicting with an already-satisfying `vite@8.3.0`). Deleting
    `package-lock.json` and reinstalling from scratch resolved it cleanly —
    worth knowing if a future dependency bump hits the same confusing error.
- `@types/node` (`22.20.1` → `22.20.4`) and `tsx` (`4.19.2`-range → latest
  patch) were updated within their existing `package.json` ranges.
- `@types/node` major `26.x` and `typescript` major `7.x` are available but
  **not** applied here: no CVE forces them, `engines.node` in `package.json`
  is `>=20` so jumping `@types/node` straight to a `26.x` major would target
  a much newer Node API surface than the stated minimum, and TypeScript 7 is
  a large jump (the Go-based "tsgo" rewrite) that deserves its own
  verification pass rather than a drive-by bump here.

## Feedback centralizzato — idea, non ancora decisa

Questo repo **non ha ancora nessuna feature di note/feedback**: nessun
endpoint, nessun worker, nessuna tabella per questo. Idea da valutare in
futuro (non implementata qui, solo documentata):

Un piccolo widget per lasciare una nota libera mentre si guarda il sito
(tipo "manca un locale", "questo evento è sbagliato"), salvata su un
**database Cloudflare**, mai in `localStorage`/solo lato browser — una nota
che nessuno legge non serve a niente, e questo è un sito statico su GitHub
Pages senza alcun backend proprio oggi.

Due strade possibili, ancora da scegliere:

1. **D1 dedicato a questo sito** — lo stesso pattern già usato da altri
   progetti di Alessio: `ear-training`, `geopolitics-atlas`,
   `eating-amsterdam`, `markets-first-principles` (vedi
   `markets-first-principles/worker/schema.sql` e `worker/README.md` per il
   riferimento più diretto: un Worker con un'unica rotta `POST /notes`,
   nessun endpoint di lettura pubblico, note lette solo via `wrangler`/API
   Cloudflare).
2. **Un unico D1 condiviso fra tutti i siti** (tabella con colonna `site` per
   distinguere le note di questo sito da quelle degli altri), dietro un
   unico Worker con allowlist CORS per dominio chiamante — meno
   infrastruttura da mantenere, ma un bug nel Worker condiviso romperebbe la
   raccolta note ovunque, e andrebbe gestita la migrazione se in futuro
   qualche sito già passasse al pattern 1.

**Limiti minimi da avere in ogni caso, qualunque strada si scelga:**

- Nessun account utente richiesto — scrivere una nota deve restare un gesto
  a bassa frizione, coerente con il resto del sito (nessun login da nessuna
  parte).
- Rate limit ragionevole sulla scrittura, per evitare abuso su un endpoint
  pubblico che chiunque può raggiungere.
- La nota va scritta senza poterla rileggere pubblicamente: solo l'autore
  (Alessio) la legge, con un token — stesso principio già applicato al
  notebook di `realtime-earth` (`worker/notes.ts`, fail-closed senza
  `NOTES_TOKEN`) e alle note di `markets-first-principles`.

**Priorità:** questa è un'idea, non una richiesta — non implementarla senza
che Alessio la chieda esplicitamente. Se e quando verrà implementata, questo
sito diventerebbe il primo caso reale in cui scegliere fra "D1 per sito" e
"D1 condiviso" ha un impatto pratico (i due siti che già hanno il feature
oggi l'hanno costruita indipendentemente, prima che l'idea del D1 condiviso
fosse mai discussa).

## Content/pipeline follow-ups already known from README

See the "Not implemented (fine for now, worth knowing)" note under
[Map view](README.md#map-view) (marker clustering, per-event markers) and
the per-source caveats throughout the "How the scrapers were built and
verified" section of `README.md` — several sources (AmsterdamSights curated
data, DIEP Seminars, 'Skek via offbeat.amsterdam) are manually
transcribed/refreshed rather than auto-scraped and will silently go stale
until someone refreshes them by hand.
