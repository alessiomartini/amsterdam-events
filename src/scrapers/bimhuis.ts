import * as cheerio from "cheerio";
import { fetchText } from "../lib/http.js";
import type { RawEvent, ScrapeResult } from "../types.js";

const PAGE_URL = "https://www.bimhuis.nl/en/calendar";

/**
 * bimhuis.nl (the Netherlands' main jazz venue) is a Next.js app that
 * streams its calendar via React Suspense — the initial HTML has several
 * empty skeleton copies of `<li class="agenda-tile-overview__item">`
 * alongside the real, already-resolved one buried further down the same
 * response body in a `<div hidden id="S:N">` block. No JS execution
 * needed: it's real server-rendered markup in the plain HTTP response,
 * just easy to mistake for empty skeletons if you only check the first
 * occurrence — filtering to items with a non-empty title finds the real
 * 20. Verified against real markup fetched via CI, no bot protection.
 *
 * Only the first page of the calendar is covered (no "load more").
 */
export async function scrape(): Promise<ScrapeResult> {
  const html = await fetchText(PAGE_URL);
  const events = parseAgenda(html);

  if (events.length === 0) {
    console.warn(`[bimhuis] No agenda-tile-overview__item entries with a title found on ${PAGE_URL}.`);
  }

  return { source: "bimhuis", sourceName: "Bimhuis", events };
}

function parseAgenda(html: string): RawEvent[] {
  const $ = cheerio.load(html);
  const events: RawEvent[] = [];
  const seenUrls = new Set<string>();

  $("li.agenda-tile-overview__item").each((_, el) => {
    const item = $(el);
    const link = item.find("a.agenda-tile__link").first();
    const title = link.find("h3").first().text().trim();
    const href = link.attr("href");
    if (!title || !href) return;

    const url = new URL(href, PAGE_URL).toString();
    if (seenUrls.has(url)) return;
    seenUrls.add(url);

    const timeEl = item.find("time.agenda-tile__dates").first();
    const dateAttr = timeEl.attr("datetime");
    const timeText = timeEl.find("span").first().text().trim();
    const description = link.parent().find("p").first().text().trim() || undefined;

    events.push({
      title,
      url,
      description,
      venue: "Bimhuis",
      startDate: combineDateTime(dateAttr, timeText),
    });
  });

  return events;
}

function combineDateTime(date?: string, time?: string): string | undefined {
  if (!date) return undefined;
  if (!/^\d{1,2}:\d{2}$/.test(time ?? "")) return `${date}T00:00:00`;
  return `${date}T${time}:00`;
}
