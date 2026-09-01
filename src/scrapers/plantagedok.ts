import { fetchText } from "../lib/http.js";
import { extractJsonLdEvents } from "../lib/jsonld.js";
import type { ScrapeResult } from "../types.js";

const PAGE_URL = "https://plantagedok.nl/events/";

/**
 * plantagedok.nl runs WordPress with The Events Calendar plugin
 * (post-type-archive-tribe_events) — verified against real markup fetched
 * via CI. No bot protection. It server-renders a clean schema.org Event
 * JSON-LD array (not wrapped in @graph/ItemList, just a bare array of
 * Event objects), which extractJsonLdEvents already handles as-is.
 *
 * Plantage Dok is a self-managed community/cultural space (art, music,
 * activism, communal Voku dinners) — a real "park & square"/demonstration-
 * adjacent alternative-culture venue in the same spirit as radar.squat.net.
 */
export async function scrape(): Promise<ScrapeResult> {
  const html = await fetchText(PAGE_URL);
  const events = extractJsonLdEvents(html, PAGE_URL);

  if (events.length === 0) {
    console.warn(`[plantagedok] No Event JSON-LD found on ${PAGE_URL}. Markup may have changed.`);
  }

  return { source: "plantagedok", sourceName: "Plantage Dok", events };
}
