import { fetchText } from "../lib/http.js";
import { extractJsonLdEvents } from "../lib/jsonld.js";
import type { ScrapeResult } from "../types.js";

const PAGE_URL = "https://offbeat.amsterdam/place/100/'Skek";

/**
 * 'Skek's own site (skekamsterdam.cargo.site) is a client-rendered Cargo
 * SPA — no server-rendered event data to scrape without executing JS,
 * which this project doesn't do. offbeat.amsterdam is a third-party
 * Amsterdam events aggregator that maintains a per-venue page for 'Skek
 * with real schema.org Event JSON-LD (verified against real markup
 * fetched via CI, no bot protection) — sourced from the same cargo.site
 * agenda, just already extracted into structured data for us.
 *
 * `offers`/`description` are consistently empty on this page, so `price`
 * and `description` end up unset for every event — that's the source, not
 * a parsing gap. Event URLs point at the original cargo.site page anchors.
 */
export async function scrape(): Promise<ScrapeResult> {
  const html = await fetchText(PAGE_URL);
  const events = extractJsonLdEvents(html, PAGE_URL);

  if (events.length === 0) {
    console.warn(`[skek] No Event JSON-LD found on ${PAGE_URL}. Markup may have changed.`);
  }

  return { source: "skek", sourceName: "'Skek", events };
}
