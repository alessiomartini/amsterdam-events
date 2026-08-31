# Amsterdam Events

Aggregates events happening in Amsterdam — jazz & live music, free museum
entry, demonstrations, park/square events, sex-positive parties, clubbing —
from several source websites into one filterable static site.

## Sources

| Source | URL | Category default |
| --- | --- | --- |
| Jazzin' Amsterdam | https://jazzin.amsterdam/ | Jazz & live music |
| Radar (squat.net) | https://radar.squat.net/en/events/city/Amsterdam | Demonstrations / activism |
| Pluk de Liefde | https://www.plukdeliefde.nl/agenda/ | (keyword-based) |
| Knit Amsterdam | https://knit.amsterdam/events | (keyword-based) |
| Play Partners | https://www.playpartners.nl/events | Sex-positive |
| Eventbrite | search URLs in `src/scrapers/eventbrite.ts` | (keyword-based) |
| Resident Advisor — Amsterdam | https://ra.co/events/nl/amsterdam | Clubbing / electronic |
| Resident Advisor — promoter 117681 | https://ra.co/promoters/117681/events | Clubbing / electronic |

Every event also gets keyword-based categories on top of the source default
(see `src/lib/categorize.ts`), so a jazz gig on Eventbrite still lands under
"Jazz & live music", a free museum night gets tagged "Free entry", etc.

## How it works

1. **Scrape** (`npm run scrape`) — runs every scraper in `src/scrapers/`,
   normalizes results into a common `Event` shape, deduplicates across
   sources (same normalized title + day), and writes `data/events.json`.
2. **Build** (`npm run build`) — copies `data/events.json` into
   `web/data/events.json` so `web/` is a fully self-contained static site.
3. **Serve** — `web/index.html` + `web/app.js` fetch `data/events.json`
   client-side and render a searchable, filterable, date-grouped list. No
   backend needed.

A GitHub Actions workflow (`.github/workflows/scrape-and-deploy.yml`) runs
the scrape+build every 6 hours, commits the refreshed data, and deploys
`web/` to GitHub Pages.

## Local development

```bash
npm install
npm run scrape   # populates data/events.json
npm run build    # copies it into web/
npm run dev      # scrape + build + serve web/ on http://localhost:8080
```

Run `npm test` for the unit tests (JSON-LD parsing, categorization,
dedup — the parts that don't depend on live network access) and
`npm run typecheck` for TypeScript.

## Important caveat: scraper selectors are unverified

The environment this project was built in has **no outbound network
access to any of the source sites** (confirmed — both direct HTTP and the
web-fetch tool were blocked by network policy), so none of the scrapers
could be tested against live HTML. To keep them robust anyway, each one
uses a platform-agnostic strategy instead of guessed CSS selectors,
in this order of preference:

1. **A known public API**, where the platform is confidently identified —
   e.g. `plukdeliefde.nl` runs WordPress with "The Events Calendar" plugin,
   which exposes `/wp-json/tribe/events/v1/events`.
2. **schema.org `Event` JSON-LD** (`src/lib/jsonld.ts`) — most event sites
   embed this for SEO, in a `<script type="application/ld+json">` tag. This
   is used for `jazzin`, `knit`, `playpartners`, `eventbrite`, and as a
   fallback everywhere else.
3. **Next.js `__NEXT_DATA__`** (`src/lib/nextdata.ts`) — `ra.co` is a
   Next.js app, so its initial event data is embedded server-side as JSON
   rather than requiring DOM scraping. A shape-based heuristic
   (`isRaEventShaped`) picks out arrays that look like event lists.
4. **Best-effort generic HTML fallback** (Drupal "views-row" markup for
   `radar.squat.net`), clearly commented as unverified.

**Before relying on this in production**, run `npm run scrape` once with
real network access (locally, or let the GitHub Action run) and check the
console output — each scraper logs a warning if it found zero events, which
means that source's strategy didn't match the live page and needs a look
with a browser's dev tools. The architecture is built so fixing one source
means editing one file in `src/scrapers/` without touching anything else
(types, categorization, dedup, and the frontend are all source-agnostic).

### Extending

- **Add a source**: create `src/scrapers/<name>.ts` exporting
  `scrape(): Promise<ScrapeResult>`, add it to `SCRAPERS` in
  `src/scrapers/index.ts`, and add the `SourceId` to `src/types.ts`.
- **Add/adjust categories**: edit `CATEGORIES` in `src/types.ts` and the
  rules in `src/lib/categorize.ts` (source defaults + keyword regexes), and
  add a label in `web/app.js`'s `CATEGORY_LABELS`.
- **More Eventbrite searches**: add more search-result URLs to
  `SEARCH_URLS` in `src/scrapers/eventbrite.ts` (e.g. free live-music
  events, free outdoor events).
