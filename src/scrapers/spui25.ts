import { fetchText } from "../lib/http.js";
import { extractJsonLdEvents } from "../lib/jsonld.js";
import type { ScrapeResult } from "../types.js";

const PAGE_URL = "https://offbeat.amsterdam/place/47/SPUI25";

/**
 * SPUI25 (spui25.nl) is Amsterdam's academic-cultural platform — 250-300
 * free public lectures, debates and talks a year. Its own site is behind
 * Cloudflare (HTTP 403, "Just a moment..." challenge — verified live via
 * CI, same block as amsterdamsights.com), so this uses offbeat.amsterdam
 * again, the same third-party Amsterdam events aggregator already used for
 * 'Skek: it maintains a per-venue page (place id 47) with real schema.org
 * Event JSON-LD, no bot protection. `fetchText` + `extractJsonLdEvents`,
 * same shape as skek.ts/plantagedok.ts.
 */
export async function scrape(): Promise<ScrapeResult> {
  const html = await fetchText(PAGE_URL);
  const events = extractJsonLdEvents(html, PAGE_URL);

  if (events.length === 0) {
    console.warn(`[spui25] No Event JSON-LD found on ${PAGE_URL}. Markup may have changed.`);
  }

  return { source: "spui25", sourceName: "SPUI25", events };
}
