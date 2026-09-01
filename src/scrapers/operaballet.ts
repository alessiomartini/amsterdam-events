import * as cheerio from "cheerio";
import { fetchText } from "../lib/http.js";
import type { RawEvent, ScrapeResult } from "../types.js";

const PAGE_URL = "https://www.operaballet.nl/en/program";

/**
 * operaballet.nl (Dutch National Opera & Ballet) is a Drupal site that
 * server-renders its program listing as plain `<article class="programCard">`
 * markup — no bot protection, no JSON-LD, verified against real markup
 * fetched via CI. The filtered `/en/program/25` URL only returns Ballet
 * items; the unfiltered `/en/program` page returns the mixed Opera/Ballet
 * listing used here.
 *
 * Each card is a full run of performances ("10 – 27 September 2026", or
 * even two separate runs like "15 October – 8 November 2026, 11 – 24 April
 * 2027" for a show revived later in the season), not a single dated
 * instance — too free-form to reliably parse into startDate/endDate, so
 * (like iamsterdam.ts) this keeps the raw text as `dateText` only.
 *
 * Only the first page of the listing is covered (no pagination), and the
 * page occasionally repeats the exact same show/link twice — deduped here
 * by url.
 */
export async function scrape(): Promise<ScrapeResult> {
  const html = await fetchText(PAGE_URL);
  const events = parseProgram(html);

  if (events.length === 0) {
    console.warn(`[operaballet] No programCard entries found on ${PAGE_URL}. Markup may have changed.`);
  }

  return { source: "operaballet", sourceName: "Dutch National Opera & Ballet", events };
}

function parseProgram(html: string): RawEvent[] {
  const $ = cheerio.load(html);
  const events: RawEvent[] = [];
  const seenUrls = new Set<string>();

  $("article.programCard").each((_, el) => {
    const item = $(el);
    const title = item.find(".programCard__title").first().text().trim();
    const href = item.find("a.cta-button").first().attr("href");
    if (!title || !href) return;

    const url = new URL(href, PAGE_URL).toString();
    if (seenUrls.has(url)) return;
    seenUrls.add(url);

    const dateText = item.find(".programCard__date").first().text().trim() || undefined;
    const building = item.find(".programCard__building").first().text().trim().replace(/,\s*$/, "");
    const place = item.find(".programCard__place").first().text().trim();
    const venue = [building, place].filter(Boolean).join(" – ") || undefined;
    const description = item.find(".programCard__description p").first().text().trim() || undefined;

    events.push({ title, url, description, venue, dateText });
  });

  return events;
}
