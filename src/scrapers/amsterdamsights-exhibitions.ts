import type { RawEvent, ScrapeResult } from "../types.js";
import exhibitions from "../data/amsterdamsights-exhibitions.json" with { type: "json" };

/**
 * amsterdamsights.com's "Exhibitions" page (current/upcoming museum and
 * gallery shows) is excluded from automated scraping like the rest of the
 * site (Cloudflare — see README). Unlike the "Free Events" page this one
 * *is* a dated calendar, so unlike `amsterdamsights-manual.ts` it's not
 * evergreen — it needs periodic re-transcription as exhibitions open and
 * close, same as any other manually curated source.
 *
 * Transcribed from a real copy of the page saved locally by the user
 * (browser "Save Page As", not a live automated fetch), parsed once with a
 * local script into `src/data/amsterdamsights-exhibitions.json`. Most
 * entries have real start/end dates; where the source only gave vague text
 * ("Autumn 2026", "From 19 Sep 2026" with no end) the event keeps its
 * `dateText` but has no `startDate`/`endDate`.
 *
 * Last refreshed: 2026-08-31, from a page save provided by the user.
 */
export async function scrape(): Promise<ScrapeResult> {
  return {
    source: "amsterdamsights-exhibitions",
    sourceName: "AmsterdamSights (curated exhibitions)",
    events: exhibitions as RawEvent[],
  };
}
