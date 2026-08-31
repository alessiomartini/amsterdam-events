import { fetchText } from "../lib/http.js";
import { extractJsonLdEvents } from "../lib/jsonld.js";
import type { ScrapeResult } from "../types.js";

const URL = "https://www.playpartners.nl/events";

/** Sex-positive / play-party events; category defaults to "sex-positive" in categorize.ts. */
export async function scrape(): Promise<ScrapeResult> {
  const html = await fetchText(URL);
  const events = extractJsonLdEvents(html, URL);
  if (events.length === 0) {
    console.warn(
      `[playpartners] No JSON-LD Event data found on ${URL}. Inspect the live HTML and ` +
        `extend src/scrapers/playpartners.ts with a custom fallback if needed.`,
    );
  }
  return { source: "playpartners", sourceName: "Play Partners", events };
}
