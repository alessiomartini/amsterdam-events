import { fetchText } from "../lib/http.js";
import { extractJsonLdEvents } from "../lib/jsonld.js";
import type { ScrapeResult } from "../types.js";

const URL = "https://knit.amsterdam/events";

export async function scrape(): Promise<ScrapeResult> {
  const html = await fetchText(URL);
  const events = extractJsonLdEvents(html, URL);
  if (events.length === 0) {
    console.warn(
      `[knit] No JSON-LD Event data found on ${URL}. Inspect the live HTML and ` +
        `extend src/scrapers/knit.ts with a custom fallback if needed.`,
    );
  }
  return { source: "knit", sourceName: "Knit Amsterdam", events };
}
