import { fetchJson } from "../lib/http.js";
import type { RawEvent, ScrapeResult } from "../types.js";

const API_BASE = "https://www.eventbriteapi.com/v3/events/search/";
const MAX_PAGES = 5;

interface EventbriteVenue {
  name?: string;
  address?: {
    address_1?: string;
    city?: string;
    localized_address_display?: string;
  };
}

interface EventbriteEvent {
  id: string;
  name?: { text?: string };
  summary?: string;
  description?: { text?: string };
  url: string;
  start?: { utc?: string; local?: string };
  end?: { utc?: string; local?: string };
  is_free?: boolean;
  logo?: { url?: string };
  venue?: EventbriteVenue;
}

interface EventbriteSearchResponse {
  events?: EventbriteEvent[];
  pagination?: { has_more_items?: boolean; continuation?: string };
  error?: string;
  error_description?: string;
}

/**
 * Uses Eventbrite's official Events API instead of scraping search-result
 * pages — the compliant path, since eventbrite.com itself sits behind an
 * AWS WAF "Human Verification" challenge (see README). Requires a Personal
 * OAuth Token from https://www.eventbrite.com/platform/api-keys, supplied
 * via the EVENTBRITE_API_TOKEN environment variable (a GitHub Actions
 * secret in CI). Without a token, this scraper is skipped, not failed.
 *
 * CONFIRMED (tested live in CI with a real personal token): this endpoint
 * returns 404 NOT_FOUND — "The path you requested does not exist." —
 * Eventbrite disabled public /events/search/ access for third-party keys
 * around 2020, specifically to stop aggregation like this. No
 * EVENTBRITE_API_TOKEN secret is configured, so this stays a documented
 * no-op rather than hitting a dead endpoint on a schedule; kept in place
 * in case Eventbrite's policy ever changes.
 */
export async function scrape(): Promise<ScrapeResult> {
  const token = process.env.EVENTBRITE_API_TOKEN;
  if (!token) {
    console.warn(
      "[eventbrite] EVENTBRITE_API_TOKEN not set — skipping. See README for how to get one.",
    );
    return { source: "eventbrite", sourceName: "Eventbrite", events: [] };
  }

  const events: RawEvent[] = [];
  let continuation: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(API_BASE);
    url.searchParams.set("location.address", "Amsterdam, Netherlands");
    url.searchParams.set("location.within", "15km");
    url.searchParams.set("expand", "venue");
    url.searchParams.set("sort_by", "date");
    if (continuation) url.searchParams.set("continuation", continuation);

    let data: EventbriteSearchResponse;
    try {
      data = await fetchJson<EventbriteSearchResponse>(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.warn(`[eventbrite] API request failed: ${(err as Error).message}`);
      break;
    }

    if (data.error) {
      console.warn(`[eventbrite] API error: ${data.error} — ${data.error_description ?? ""}`);
      break;
    }

    events.push(...(data.events ?? []).map(toRawEvent));

    if (!data.pagination?.has_more_items || !data.pagination.continuation) break;
    continuation = data.pagination.continuation;
  }

  if (events.length === 0) {
    console.warn("[eventbrite] API returned zero events.");
  }

  return { source: "eventbrite", sourceName: "Eventbrite", events };
}

export function toRawEvent(event: EventbriteEvent): RawEvent {
  const address = event.venue?.address;
  return {
    sourceId: event.id,
    title: event.name?.text ?? "Untitled event",
    description: event.description?.text ?? event.summary,
    url: event.url,
    imageUrl: event.logo?.url,
    venue: event.venue?.name,
    address: address?.localized_address_display ?? address?.address_1 ?? address?.city,
    startDate: event.start?.local ?? event.start?.utc,
    endDate: event.end?.local ?? event.end?.utc,
    isFree: event.is_free,
    price: event.is_free ? "Free" : undefined,
  };
}
