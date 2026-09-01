import * as cheerio from "cheerio";
import { fetchText } from "../lib/http.js";
import { extractJsonLdEvents } from "../lib/jsonld.js";
import type { RawEvent, ScrapeResult } from "../types.js";

const PAGE_URL = "https://www.playpartners.nl/events";

/**
 * playpartners.nl runs on Squarespace's built-in Events collection —
 * verified against real markup: <article class="eventlist-event"> blocks
 * with a stable, well-documented set of eventlist-* classes. Sex-positive
 * / play-party events; category defaults to "sex-positive" in categorize.ts.
 *
 * Events aren't Amsterdam-only (real data included Utrecht venues), so we
 * filter to venues that mention Amsterdam. An event with no address text
 * is kept rather than dropped, since we can't tell either way.
 *
 * Squarespace's Events collection also lists past events on the same page
 * (marked `eventlist-event--past`, vs `eventlist-event--upcoming`) — those
 * are skipped explicitly rather than relying on the Amsterdam-venue filter
 * to incidentally exclude them.
 */
export async function scrape(): Promise<ScrapeResult> {
  const html = await fetchText(PAGE_URL);
  const events = parseEventlist(html);

  if (events.length === 0) {
    console.warn(`[playpartners] No eventlist-event blocks found on ${PAGE_URL}. Falling back to JSON-LD.`);
    events.push(...extractJsonLdEvents(html, PAGE_URL));
  }

  return { source: "playpartners", sourceName: "Play Partners", events };
}

function parseEventlist(html: string): RawEvent[] {
  const $ = cheerio.load(html);
  const events: RawEvent[] = [];

  $("article.eventlist-event").each((_, el) => {
    const article = $(el);
    if (article.hasClass("eventlist-event--past")) return;

    const titleLink = article.find(".eventlist-title-link").first();
    const title = titleLink.text().trim();
    const href = titleLink.attr("href");
    if (!title || !href) return;

    const startDate = article.find("time.event-date").first().attr("datetime");
    const startTime = article.find("time.event-time-localized-start").first().text().trim();

    const addressItem = article.find(".eventlist-meta-address").first().clone();
    addressItem.find("a").remove();
    const venue = normalizeWhitespace(addressItem.text());
    if (venue && !/amsterdam/i.test(venue)) return;

    const imageUrl =
      article.find(".eventlist-column-thumbnail img").first().attr("data-src") ??
      article.find(".eventlist-column-thumbnail img").first().attr("src");

    events.push({
      title,
      url: new URL(href, PAGE_URL).toString(),
      description: article.find(".eventlist-excerpt").first().text().trim() || undefined,
      venue,
      imageUrl: imageUrl || undefined,
      startDate: combineDateTime(startDate, startTime),
    });
  });

  return events;
}

function normalizeWhitespace(text: string): string | undefined {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

function combineDateTime(isoDate?: string, time?: string): string | undefined {
  if (!isoDate) return undefined;
  if (!time) return isoDate;
  const match = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(time);
  if (!match) return isoDate;
  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hours += 12;
  return `${isoDate}T${String(hours).padStart(2, "0")}:${match[2]}:00`;
}
