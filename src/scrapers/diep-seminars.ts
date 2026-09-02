import type { RawEvent, ScrapeResult } from "../types.js";
import seminars from "../data/diep-seminars.json" with { type: "json" };

/**
 * DIEP (Dutch Institute for Emergent Phenomena, at UvA's Institute for
 * Advanced Study) announces its weekly seminar by email
 * (diepseminars@list.uva.nl) rather than a dated calendar page. Its own
 * "DIEP seminar series" page on ias.uva.nl is just a static blurb pointing
 * at the IAS's general events listing — checked live via CI, that listing
 * (a real JSON API, not scraped HTML — see string-seminar.ts for the same
 * trick on a different UvA site) does NOT carry the individual weekly DIEP
 * talks, only larger one-off IAS events. So unlike Bimhuis/Concertgebouw/
 * Opera & Ballet/SPUI25/the string seminars, there's no live public feed
 * to point a scraper at here.
 *
 * Transcribed instead from the mailing list's own "Upcoming sessions" list
 * (each week's email footer) — the same manually-curated pattern as the
 * amsterdamsights-* sources: `src/data/diep-seminars.json`, refreshed by
 * hand from the mailing list, not auto-updated on a schedule. The regular
 * slot (Thursdays, 11:00, IAS second floor library, Oude Turfmarkt 147) is
 * consistent across every past per-talk announcement checked, but future
 * weeks not yet individually announced keep that as a best-guess default
 * with a "time to be confirmed" note rather than asserting it outright.
 *
 * Last refreshed: 2026-09-02, from the DIEPseminars mailing list.
 */
export async function scrape(): Promise<ScrapeResult> {
  return {
    source: "diep-seminars",
    sourceName: "DIEP Seminars (IAS, UvA)",
    events: seminars as RawEvent[],
  };
}
