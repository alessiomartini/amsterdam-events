import type { RawEvent, ScrapeResult } from "../types.js";
import events from "../data/amsterdamsights-events.json" with { type: "json" };

/**
 * amsterdamsights.com's monthly "Events by Month" pages (September through
 * December — festivals, fairs, concerts, sports, and other one-off or
 * annual happenings, as opposed to the evergreen list on the "Free Events"
 * page or the dated museum shows on "Exhibitions") are excluded from
 * automated scraping like the rest of the site (Cloudflare — see README).
 *
 * Transcribed from real copies of those pages saved locally by the user
 * (browser "Save Page As", not a live automated fetch), parsed once with a
 * local script into `src/data/amsterdamsights-events.json`. Many entries
 * are annual events the source lists with last year's specific date (e.g.
 * "September 18-21, 2025" on the page for the *upcoming* September); the
 * parse step rolled those forward by whole years so they land on their
 * next real occurrence instead of showing as already past. A handful of
 * entries only ever had vague text ("end August-end April", "eve of
 * December 5") and keep `dateText` with no computed `startDate`.
 *
 * Only September through December were saved/transcribed (the months the
 * user provided) — there's no coverage for the rest of the year yet.
 *
 * Last refreshed: 2026-08-31, from page saves provided by the user.
 */
export async function scrape(): Promise<ScrapeResult> {
  return {
    source: "amsterdamsights-events",
    sourceName: "AmsterdamSights (curated events calendar)",
    events: events as RawEvent[],
  };
}
