import { fetchText } from "../lib/http.js";
import { extractJsonLdEvents } from "../lib/jsonld.js";
import type { RawEvent, ScrapeResult } from "../types.js";

// One search URL per Eventbrite category/interest we care about. Add more
// https://www.eventbrite.com/d/netherlands--amsterdam/... search URLs here
// to widen coverage (e.g. free music, free outdoor events).
const SEARCH_URLS = [
  "https://www.eventbrite.com/d/netherlands--amsterdam/free--film-and-media--events/",
];

export async function scrape(): Promise<ScrapeResult> {
  const events: RawEvent[] = [];
  for (const url of SEARCH_URLS) {
    try {
      const html = await fetchText(url);
      const found = extractJsonLdEvents(html, url);
      if (found.length === 0) {
        console.warn(
          `[eventbrite] No JSON-LD Event data found on ${url}. Eventbrite search ` +
            `pages may need a bespoke scraper — inspect the live HTML.`,
        );
      }
      events.push(...found);
    } catch (err) {
      console.warn(`[eventbrite] Failed to fetch ${url}: ${(err as Error).message}`);
    }
  }
  return { source: "eventbrite", sourceName: "Eventbrite", events };
}
