import * as cheerio from "cheerio";
import { fetchText } from "../lib/http.js";
import type { RawEvent, ScrapeResult } from "../types.js";

const PAGE_URL = "https://mezrab.nl/";

/**
 * mezrab.nl ("The House of Stories" — storytelling, music, comedy, dance)
 * server-renders its upcoming-events widget (WordPress "Events Manager"
 * plugin) right on the homepage — verified against real markup fetched via
 * CI, no bot protection. Each occurrence is a `<table class="tableeventd">`
 * with a `"Tue 1.09 | 20:00"`-style date cell and a title link; a handful
 * carry a second link flagging an alternate venue ("The Other Mezrab").
 *
 * The date cells have no year — inferred from today's date, rolling
 * forward a year if that would otherwise land in the past (the widget
 * only ever lists near-term upcoming events, so this is very unlikely to
 * actually trigger, but keeps the scraper correct across a year boundary).
 */
export async function scrape(): Promise<ScrapeResult> {
  const html = await fetchText(PAGE_URL);
  const events = parseEventsWidget(html);

  if (events.length === 0) {
    console.warn(`[mezrab] No tableeventd rows found on ${PAGE_URL}. Markup may have changed.`);
  }

  return { source: "mezrab", sourceName: "Mezrab", events };
}

function parseEventsWidget(html: string): RawEvent[] {
  const $ = cheerio.load(html);
  const events: RawEvent[] = [];

  $("table.tableeventd").each((_, table) => {
    const row = $(table);
    const dateText = row.find("td.eventtd24").first().text().trim();
    const titleCell = row.find("td.eventtda24").first();
    const titleLink = titleCell.find("a").first();
    const title = titleLink.text().trim();
    const href = titleLink.attr("href");
    if (!title || !href || !dateText) return;

    const locationSpan = titleCell.find(".locationhomepage").first();
    const venue = locationSpan.length
      ? locationSpan.text().replace(/^Location:/i, "").trim() || undefined
      : "Mezrab";

    events.push({
      title,
      url: new URL(href, PAGE_URL).toString(),
      venue,
      startDate: parseMezrabDate(dateText),
      dateText,
    });
  });

  return events;
}

/** Parses "Tue 1.09 | 20:00" -> ISO datetime, inferring/rolling the year. */
function parseMezrabDate(text: string): string | undefined {
  const match = /(\d{1,2})\.(\d{1,2})\s*\|\s*(\d{1,2}):(\d{2})/.exec(text);
  if (!match) return undefined;
  const [, dayStr, monthStr, hourStr, minuteStr] = match;
  const day = Number(dayStr);
  const month = Number(monthStr) - 1;
  const now = new Date();
  let year = now.getFullYear();
  const candidate = new Date(year, month, day);
  if (candidate.getTime() < now.getTime() - 30 * 86400000) year += 1;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month + 1)}-${pad(day)}T${hourStr.padStart(2, "0")}:${minuteStr}:00`;
}
