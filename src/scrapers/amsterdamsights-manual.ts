import type { RawEvent, ScrapeResult } from "../types.js";
import freeEvents from "../data/amsterdamsights-free-events.json" with { type: "json" };

/**
 * amsterdamsights.com is excluded from automated scraping (see README —
 * Cloudflare actively blocks headless traffic, not a trivial check). Its
 * "Free Events" page isn't a dated event calendar though: it's a small,
 * evergreen list of standing free activities/attractions around Amsterdam
 * (a free ferry, weekly yoga in a park, a recurring free jazz night, museum
 * gardens open to the public, ...) that barely changes over time, which
 * makes it a reasonable candidate for manual curation instead of scraping.
 *
 * This data is transcribed from a real copy of the page saved locally by
 * the user (browser "Save Page As", not a live automated fetch), parsed
 * once with a local script into `src/data/amsterdamsights-free-events.json`.
 * It is NOT auto-updated on a schedule; if it goes stale, save a fresh copy
 * of the page and re-run the parse.
 *
 * Last refreshed: 2026-08-31, from a page save provided by the user.
 */
export async function scrape(): Promise<ScrapeResult> {
  return {
    source: "amsterdamsights-manual",
    sourceName: "AmsterdamSights (curated list)",
    events: freeEvents as RawEvent[],
  };
}
