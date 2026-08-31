import * as cheerio from "cheerio";
import { fetchText } from "../lib/http.js";
import { extractMicrodataEvents } from "../lib/microdata.js";
import type { RawEvent, ScrapeResult } from "../types.js";

const PAGE_URL = "https://jazzin.amsterdam/";

/**
 * jazzin.amsterdam is a Next.js app that server-renders its gig table with
 * schema.org Microdata (<tr itemscope itemtype="https://schema.org/Event">
 * per gig) — verified against real markup fetched via CI. Microdata covers
 * title/url/startDate/venue; price sits in a plain (un-annotated) table
 * cell, so we attach it with a second pass keyed by the event url.
 */
export async function scrape(): Promise<ScrapeResult> {
  const html = await fetchText(PAGE_URL);
  const events = extractMicrodataEvents(html, PAGE_URL);
  attachPrices(html, events);

  if (events.length === 0) {
    console.warn(
      `[jazzin] No schema.org Event microdata found on ${PAGE_URL}. The site's ` +
        `markup may have changed — inspect it and update src/scrapers/jazzin.ts.`,
    );
  }
  return { source: "jazzin", sourceName: "Jazzin' Amsterdam", events };
}

function attachPrices(html: string, events: RawEvent[]): void {
  const $ = cheerio.load(html);
  const priceByUrl = new Map<string, string>();

  $('tr[itemtype$="schema.org/Event"]').each((_, row) => {
    const $row = $(row);
    const url = $row.find('a[itemprop="url"]').attr("href");
    const price = $row.find("td").last().text().trim();
    if (url && price) priceByUrl.set(url, price);
  });

  for (const event of events) {
    const price = priceByUrl.get(event.url);
    if (!price) continue;
    event.price = /^0([.,]0+)?$/.test(price) ? "Free" : price;
    event.isFree = /^0([.,]0+)?$/.test(price);
  }
}
