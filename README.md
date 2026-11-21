# Amsterdam Events

Aggregates events happening in Amsterdam — jazz, classical, opera & ballet,
live music, free museum entry, demonstrations, park/square events,
sex-positive parties, clubbing — from several source websites into one
filterable static site.

## Sources

| Source | URL | Status | Category default |
| --- | --- | --- | --- |
| Jazzin' Amsterdam | https://jazzin.amsterdam/ | ✅ working | Live music (+ jazz keyword) |
| Radar (squat.net) | https://radar.squat.net/en/events/city/Amsterdam | ✅ working, paginated up to 15 pages (~300 events); occasionally intermittent 403s (self-resolving, same pattern as Pluk de Liefde's earlier issue) | (keyword-based) |
| Pluk de Liefde | https://www.plukdeliefde.nl/agenda/ | ✅ working, filtered to Amsterdam | (keyword-based) |
| Knit Amsterdam | https://knit.amsterdam/events | ✅ working | Sex-positive, clubbing |
| Play Partners | https://www.playpartners.nl/events | ✅ working, filtered to Amsterdam | Sex-positive |
| Eventbrite | official Events API, `location.address=Amsterdam` | ❌ excluded — API confirms `/events/search/` no longer exists for third-party tokens | (keyword-based) |
| Resident Advisor — Amsterdam | https://ra.co/events/nl/amsterdam | ❌ excluded — real CAPTCHA (DataDome) | Clubbing / electronic |
| Resident Advisor — promoter 117681 | https://ra.co/promoters/117681/events | ❌ excluded — real CAPTCHA (DataDome) | Clubbing / electronic |
| AmsterdamSights (any page) | https://www.amsterdamsights.com/events/ | ❌ excluded from automated scraping — Cloudflare blocks it outright | — |
| AmsterdamSights (curated recurring activities) | https://www.amsterdamsights.com/events/free-events.html | ✅ manually curated — transcribed from a page save, not scraped, see note below | (keyword-based, `isFree` always `true`) |
| AmsterdamSights (curated exhibitions) | https://www.amsterdamsights.com/events/exhibitions.html | ✅ manually curated — transcribed from a page save, not scraped, see note below | (keyword-based) |
| AmsterdamSights (curated events calendar) | https://www.amsterdamsights.com/events/{september,october,november,december}.html | ✅ manually curated — transcribed from page saves, not scraped, see note below | (keyword-based) |
| I amsterdam (official tourism board) | https://www.iamsterdam.com/en/whats-on/calendar | ✅ working — replacement for AmsterdamSights | (keyword-based, `isFree` from a "free" tag) |
| Mezrab | https://mezrab.nl/ | ✅ working, occasionally intermittent connection failures from CI (same self-resolving pattern as Radar/Pluk de Liefde) | (keyword-based) |
| Plantage Dok | https://plantagedok.nl/events/ | ✅ working | (keyword-based) |
| Takland | (no dedicated site) | ✅ already covered — its events are posted on radar.squat.net, which is already scraped | (keyword-based) |
| Bimhuis | https://www.bimhuis.nl/en/calendar | ✅ working | Jazz |
| Het Concertgebouw | https://www.concertgebouw.nl/en/concerts-and-tickets | ✅ working | Classical |
| Dutch National Opera & Ballet | https://www.operaballet.nl/en/program | ✅ working | Opera & ballet |
| 'Skek | https://offbeat.amsterdam/place/100/'Skek (its own site, skekamsterdam.cargo.site, is still unscrapable — see note below) | ✅ working, via a third-party aggregator | (keyword-based) |
| SPUI25 | https://offbeat.amsterdam/place/47/SPUI25 (its own site, spui25.nl, is Cloudflare-protected — see note below) | ✅ working, via the same third-party aggregator as 'Skek | (keyword-based, `isFree` from JSON-LD when present) |
| UvA String Theory Seminars | Google Calendar `.ics` feed (`esk71dgb63h0pdum12cnovpisk@group.calendar.google.com`) | ✅ working | `isFree: true` |
| DIEP Seminars (IAS, UvA) | mailing list (`diepseminars@list.uva.nl`) | ✅ manually curated from the mailing list, not scraped, see note below | `isFree: true` |

Every event also gets keyword-based categories on top of the source default
(see `src/lib/categorize.ts`), so a jazz gig on Eventbrite still lands under
"Jazz", a free museum night gets tagged "Free entry", etc. Jazz, classical,
opera/ballet, and general live music are separate categories rather than one
umbrella — split from an original single "Jazz & live music" category once
Bimhuis, Concertgebouw, and Opera & Ballet made it clear they needed
distinguishing (see `CATEGORIES` in `src/types.ts`).

Pluk de Liefde and Play Partners both list events across the Netherlands, not
just Amsterdam — their scrapers filter to entries whose venue text mentions
Amsterdam.

## How it works

1. **Scrape** (`npm run scrape`) — runs every scraper in `src/scrapers/`,
   normalizes results into a common `Event` shape, deduplicates across
   sources (same normalized title + day), geocodes each event's venue/address
   (see [Map view](#map-view) below), and writes `data/events.json`.
2. **Build** (`npm run build`) — copies `data/events.json` into
   `web/data/events.json` and vendors the Leaflet map library from
   `node_modules` into `web/vendor/leaflet/`, so `web/` is a fully
   self-contained static site (no CDN dependency at runtime either).
3. **Serve** — `web/index.html` + `web/app.js` fetch `data/events.json`
   client-side and render a searchable, filterable, date-grouped list (or a
   map, see below). No backend needed.

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

Run `npm test` for the unit tests (JSON-LD/microdata parsing, categorization,
dedup — the parts that don't depend on live network access) and
`npm run typecheck` for TypeScript.

## Map view

The **Map** toggle (next to **List**, in the controls) plots events on an
interactive map of Amsterdam instead of a chronological list — one marker
per venue, clicking it opens a popup listing that venue's events (title,
day/time, a link out to the source). All the same filters (category, free
only, search) apply to the map too, plus a **Day** picker specific to it:
leave it empty to see every upcoming event at each venue, or pick a date to
narrow every venue's popup down to just that day.

Every event — in the list and in map popups — also has a **+ Calendar**
button that opens Google Calendar's "quick add" page in a new tab, prefilled
with the event's title, time, venue and a link back to the source (Google's
own `calendar.google.com/calendar/render?action=TEMPLATE` deep link, the
same one Google's own "Add to Calendar" buttons use — no sign-in or API
access from this site). Events with only a free-text date (no real
`startDate`) don't get the button, since there's no time to build a
calendar entry from. When a source doesn't give an end time, the event
defaults to a 2-hour slot.

How it's built:

- **Geocoding** (`src/lib/geocode.ts`) — each event's `venue`/`address` text
  is looked up via [Nominatim](https://nominatim.openstreetmap.org)
  (OpenStreetMap's free geocoder, no API key) during `npm run scrape`, and
  the resulting lat/lon is attached directly to the event. Results are
  cached in `src/data/venue-coords.json`, committed to the repo alongside
  `data/events.json` — a given venue is only ever geocoded once, which is
  both a lot faster on every run after the first and what Nominatim's
  [usage policy](https://operations.osmfoundation.org/policies/nominatim/)
  (max 1 request/second, don't re-request what you already have) actually
  asks for. A venue Nominatim can't resolve is cached as a known miss too,
  so it isn't retried every run — that event just won't have a marker.
  Concertgebouw's and Opera & Ballet's venue strings include a room suffix
  ("Concertgebouw – Main Hall") that Nominatim has no chance of resolving as
  written; only the part before " – " is used for geocoding (and as the
  cache key, so every room in a building shares one lookup and one pin) —
  the full "Building – Room" string is still what's shown on the event card
  itself, untouched.
- **Rendering** (`web/app.js` + [Leaflet](https://leafletjs.com)) — Leaflet
  is a real npm dependency; `npm run build` copies its built JS/CSS/marker
  images from `node_modules/leaflet/dist` into `web/vendor/leaflet/`
  (gitignored — regenerated on every build, including in CI right before
  deploy) so the map library ships with the site instead of depending on a
  CDN at runtime, same "self-contained static site" reasoning as copying
  `data/events.json` into `web/`. The actual map tile images still come
  from OpenStreetMap's tile server at view time (that part can't be
  vendored — it's the whole point of a pannable map), which is normal,
  expected, and within OSM's tile usage policy for a small site like this.
  Markers are grouped by rounded lat/lon rather than by venue string, so
  Concertgebouw's different rooms still collapse into a single pin.

Not implemented (fine for now, worth knowing): marker clustering (a very
dense area could show overlapping pins at low zoom — didn't seem worth a
second vendored library yet) and per-event markers (it's one marker per
venue, not one per event — a busy multi-event-a-day venue just gets a
longer popup list).

## Scrapers

How each scraper was built, what was verified and the per-source caveats are in
[`docs/scrapers.md`](docs/scrapers.md). If a working scraper stops finding events (a source
redesigned its site), re-run the debug-fetch workflow against `main` and fix the one file in
`src/scrapers/` that broke.

### Extending

- **Add a source**: create `src/scrapers/<name>.ts` exporting
  `scrape(): Promise<ScrapeResult>`, add it to `SCRAPERS` in
  `src/scrapers/index.ts`, and add the `SourceId` to `src/types.ts`.
- **Add/adjust categories**: edit `CATEGORIES` in `src/types.ts` and the
  rules in `src/lib/categorize.ts` (source defaults + keyword regexes), and
  add a label in `web/app.js`'s `CATEGORY_LABELS`.

See `ROADMAP.md` for known issues, dependency notes and open ideas.
