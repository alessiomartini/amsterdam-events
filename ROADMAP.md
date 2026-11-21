# Roadmap

<!-- Single file for todo, ideas, decisions and log, read by Projects Overview (https://alessiomartini.github.io/projects-overview/). Protocol: templates/ROADMAP.md in projects-overview. -->

## To do
- [x] Aggregation from several sources and a filterable static site
- [x] Automatic event refresh
- [x] Fix `npm run build` on Windows (fixed 2026-10-22, see Decisions and things tried)
- [ ] Verify the `URL.pathname` → `fileURLToPath()` fix on Windows (`npm run build`). Needs Alessio on a Windows checkout: it has only been verified on Linux (typecheck, test, build, and a CRLF-converted copy)
- [x] Decide on centralized feedback across the sites (2026-11-06: single site-notes Worker)
- [x] Centralized feedback: decided and done on 2026-11-06 with the single site-notes Worker (moved here from Ideas)

## Ideas

### Centralized feedback: historical note (decided and done 2026-11-06)

The text below was written before the decision; it is kept for the reasoning. The outcome is the single site-notes Worker (see the Log).

This repo **did not yet have any note/feedback feature** when this was written:
no endpoint, no worker, no table for it. Idea to evaluate in the future
(not implemented here, only documented):

A small widget to leave a free-text note while looking at the site
(e.g. "a venue is missing", "this event is wrong"), saved to a
**Cloudflare database**, never only in `localStorage`/browser side: a note
nobody reads is useless, and this is a static site on GitHub Pages with no
backend of its own today.

Two possible routes, still to be chosen:

1. **A D1 dedicated to this site**: the same pattern already used by other
   projects of Alessio: `ear-training`, `geopolitics-atlas`,
   `eating-amsterdam`, `markets-first-principles` (see
   `markets-first-principles/worker/schema.sql` and `worker/README.md` for
   the most direct reference: a Worker with a single `POST /notes` route,
   no public read endpoint, notes read only via `wrangler`/the Cloudflare
   API).
2. **A single D1 shared by all the sites** (table with a `site` column to
   tell this site's notes from the others'), behind a single Worker with a
   CORS allowlist per calling domain: less infrastructure to maintain, but
   a bug in the shared Worker would break note collection everywhere, and
   a migration would have to be handled if some site later moved to
   pattern 1.

**Minimum limits to have in any case, whichever route is chosen:**

- No user account required: writing a note must stay a low-friction
  gesture, consistent with the rest of the site (no login anywhere).
- A reasonable rate limit on writes, to avoid abuse of a public endpoint
  anyone can reach.
- The note is written without being publicly readable: only the author
  (Alessio) reads it, with a token: the same principle already applied to
  the `realtime-earth` notebook (`worker/notes.ts`, fail-closed without
  `NOTES_TOKEN`) and to the notes of `markets-first-principles`.

**Priority:** this is an idea, not a request: do not implement it unless
Alessio explicitly asks. If and when it is implemented, this site would be
the first real case where choosing between "D1 per site" and "shared D1"
has a practical impact (the two sites that already have the feature built
it independently, before the idea of the shared D1 was ever discussed).

## Decisions and things tried

Ideas not yet decided, and work known to be half-done or broken. Read this
before starting new work.

### Known bug: `npm run build` fails on Windows (fixed 2026-10-22)

**Fixed on 2026-10-22**: all paths built with `new URL(..., import.meta.url).pathname` (`src/build-site.ts`, `src/scrape.ts`, `src/lib/geocode.ts`, `scripts/debug-fetch.ts`) now use `fileURLToPath()` from `node:url` (as a bonus it also decodes `%20`). Verified only on Linux (typecheck, test, build); still to be confirmed on a Windows checkout (see To do). Re-examined on 2026-10-31: no other Windows cause found (no `rm`/`cp`/`VAR=x` in the npm scripts, no `__dirname`, paths built with `join()`); typecheck, test and build also pass on a copy with all text files converted to CRLF. Below, the original description of the bug.

`src/build-site.ts` builds its source/destination paths with
`new URL(..., import.meta.url).pathname`. On Windows that produces a path
with a leading slash before the drive letter (e.g. `/E:/Alessio/...`), which
Node's `fs` functions do not resolve the way `join()`/`dirname()` expect:
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
mainly been built on Linux (CI) or macOS. Not fixed here: the fix is a
small code change (e.g. `fileURLToPath()` from `node:url` instead of
`.pathname`), but that is a source-code change outside the scope of this
documentation/dependency pass, and it deserves its own verification on an
actual Windows checkout.

### Dependency notes

- `vitest` was bumped from `^2.1.8` to `^5.0.1` (a major-version jump) to
  close 5 vulnerabilities (`npm audit`, including one marked critical)
  reported against `@vitest/mocker`/`vite`/`esbuild` in the 2.x line: there
  was no patch-level fix available. Verified with `npm run typecheck` and
  `npm test` (58/58 passing) after the bump; `npm audit` now reports 0
  vulnerabilities.
  - The first upgrade attempt (`npm install vitest@latest` with the existing
    `package-lock.json` still present) failed with a self-contradictory
    `ERESOLVE` error (`peer vite "^6.4.0 || ^7.0.0 || ^8.0.0"` reported as
    conflicting with an already-satisfying `vite@8.3.0`). Deleting
    `package-lock.json` and reinstalling from scratch resolved it cleanly;
    worth knowing if a future dependency bump hits the same confusing error.
- `@types/node` (`22.20.1` → `22.20.4`) and `tsx` (`4.19.2`-range → latest
  patch) were updated within their existing `package.json` ranges.
- `@types/node` major `26.x` and `typescript` major `7.x` are available but
  **not** applied here: no CVE forces them, `engines.node` in `package.json`
  is `>=20` so jumping `@types/node` straight to a `26.x` major would target
  a much newer Node API surface than the stated minimum, and TypeScript 7 is
  a large jump (the Go-based "tsgo" rewrite) that deserves its own
  verification pass rather than a drive-by bump here.

### Content/pipeline follow-ups already known from the docs

See the "Not implemented (fine for now, worth knowing)" note under
[Map view](README.md#map-view) (marker clustering, per-event markers) and
the per-source caveats throughout [`docs/scrapers.md`](docs/scrapers.md):
several sources (AmsterdamSights curated
data, DIEP Seminars, 'Skek via offbeat.amsterdam) are manually
transcribed/refreshed rather than auto-scraped and will silently go stale
until someone refreshes them by hand.

## Log
- 2026-11-21: 🤖 Docs cleanup: README split (per-scraper details moved to `docs/scrapers.md`), stale Windows-build note removed from CLAUDE.md, ROADMAP translated to English and its Windows items reconciled.
- 2026-11-06: added the Feedback button (`web/notes-widget.js`, POST to the site-notes Worker with a local queue): the single-Worker route was chosen; site-notes must be deployed. Note widget v2 canonical (site-notes/widget) replaces the old feedback. Note widget aligned to the final version (key#field migration, dedupe), ?v=3.
- 2026-10-31: 🤖 re-examined `npm run build` on Windows: no other cause besides `URL.pathname` (already fixed), build ok also with simulated CRLF files on Linux
- 2026-10-22: 🤖 fixed `npm run build` on Windows using `fileURLToPath()` instead of `URL.pathname` (verified only on Linux)
- 2026-10-19: installable as a standalone app from the phone (manifest with its own name, icon and scope)
- 2026-10-18: FUTURE-ARCHITECTURE.md merged into ROADMAP.md (single protocol)
- 2026-10-15: roadmap created for Projects Overview
