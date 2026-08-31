import { fetchText } from "../lib/http.js";
import { extractJsonLdEvents } from "../lib/jsonld.js";
import type { ScrapeResult } from "../types.js";

const URL = "https://jazzin.amsterdam/";

/**
 * jazzin.amsterdam lists jazz gigs around town. We don't know the exact
 * markup (couldn't reach the site from this sandbox to inspect it), so we
 * rely on schema.org Event JSON-LD, which most event-listing sites emit for
 * SEO. If the site doesn't emit it, this returns zero events and logs a
 * warning rather than guessing brittle CSS selectors.
 */
export async function scrape(): Promise<ScrapeResult> {
  const html = await fetchText(URL);
  const events = extractJsonLdEvents(html, URL);
  if (events.length === 0) {
    console.warn(
      `[jazzin] No JSON-LD Event data found on ${URL}. The page likely needs a ` +
        `custom CSS-selector scraper — inspect the live HTML and extend src/scrapers/jazzin.ts.`,
    );
  }
  return { source: "jazzin", sourceName: "Jazzin' Amsterdam", events };
}
