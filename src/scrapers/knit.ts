import * as cheerio from "cheerio";
import { fetchText } from "../lib/http.js";
import { extractJsonLdEvents } from "../lib/jsonld.js";
import type { RawEvent, ScrapeResult } from "../types.js";

const PAGE_URL = "https://knit.amsterdam/events";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/**
 * KNIT is a "sex positive event series" (per its own JSON-LD Organization
 * description). Its /events page — verified against real markup — is a
 * list of <a class="event-row" href="/events/slug"> with a
 * "sat 29 august 26"-style date span; no per-event JSON-LD or microdata.
 * Past events carry an "is-past" class and are skipped.
 */
export async function scrape(): Promise<ScrapeResult> {
  const html = await fetchText(PAGE_URL);
  const events = parseEventRows(html);

  if (events.length === 0) {
    console.warn(`[knit] No upcoming event rows found on ${PAGE_URL}. Falling back to JSON-LD.`);
    events.push(...extractJsonLdEvents(html, PAGE_URL));
  }

  return { source: "knit", sourceName: "Knit Amsterdam", events };
}

function parseEventRows(html: string): RawEvent[] {
  const $ = cheerio.load(html);
  const events: RawEvent[] = [];

  $("a.event-row").each((_, el) => {
    const row = $(el);
    if (row.hasClass("is-past")) return;

    const href = row.attr("href");
    const title = row.find(".event-name").text().trim();
    const dateText = row.find(".event-date").text().trim();
    if (!href || !title) return;

    events.push({
      title,
      url: new URL(href, PAGE_URL).toString(),
      startDate: parseKnitDate(dateText),
      dateText: dateText || undefined,
    });
  });

  return events;
}

/** Parses "sat 29 august 26" -> "2026-08-29". Returns undefined if unrecognized. */
function parseKnitDate(text: string): string | undefined {
  const match = /(\d{1,2})\s+([a-z]+)\s+(\d{2,4})/i.exec(text);
  if (!match) return undefined;
  const [, day, monthName, yearRaw] = match;
  const month = MONTHS.indexOf(monthName.toLowerCase());
  if (month === -1) return undefined;
  const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);
  return `${year}-${String(month + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
}
