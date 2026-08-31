import * as cheerio from "cheerio";
import { fetchText } from "../lib/http.js";
import { extractJsonLdEvents } from "../lib/jsonld.js";
import type { RawEvent, ScrapeResult } from "../types.js";

const PAGE_URL = "https://radar.squat.net/en/events/city/Amsterdam";

/**
 * radar.squat.net is a Drupal-based calendar for squats/social
 * centers/activist events. Strategy: JSON-LD first; if that yields
 * nothing, fall back to Drupal's conventional "views-row" listing markup
 * (each row links to a node page and usually has a date field nearby).
 * This fallback is best-effort and unverified against the live site.
 */
export async function scrape(): Promise<ScrapeResult> {
  const html = await fetchText(PAGE_URL);
  let events = extractJsonLdEvents(html, PAGE_URL);

  if (events.length === 0) {
    events = drupalViewsFallback(html);
  }

  if (events.length === 0) {
    console.warn(
      `[radar-squat] No events extracted from ${PAGE_URL}. Inspect the live HTML and ` +
        `extend src/scrapers/radar-squat.ts with the real markup.`,
    );
  }

  return { source: "radar-squat", sourceName: "Radar (squat.net)", events };
}

function drupalViewsFallback(html: string): RawEvent[] {
  const $ = cheerio.load(html);
  const events: RawEvent[] = [];

  $(".views-row, .view-content article, .node--type-event").each((_, el) => {
    const row = $(el);
    const link = row.find("a[href]").first();
    const title = link.text().trim() || row.find("h2, h3, .title").first().text().trim();
    const href = link.attr("href");
    if (!title || !href) return;

    const dateText = row.find("time, .date, .field-name-field-date").first().text().trim();
    const dateAttr = row.find("time[datetime]").first().attr("datetime");

    events.push({
      title,
      url: new URL(href, PAGE_URL).toString(),
      startDate: dateAttr,
      dateText: dateAttr ? undefined : dateText || undefined,
      venue: row.find(".location, .field-name-field-location").first().text().trim() || undefined,
    });
  });

  return events;
}
