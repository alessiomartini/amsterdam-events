import * as cheerio from "cheerio";
import { fetchText } from "../lib/http.js";
import type { RawEvent, ScrapeResult } from "../types.js";

const PAGE_URL = "https://www.concertgebouw.nl/en/concerts-and-tickets";

/**
 * concertgebouw.nl is a Nuxt app that server-renders its concert listing
 * as real DOM (`<article data-component="CardEventAndSeries">`), no bot
 * protection — verified against real markup fetched via CI. The bulk of
 * the page's data also gets embedded a second time in a minified
 * `window.__NUXT__ = ...` hydration payload for the client, but that's a
 * bundler-internal serialization format (not JSON), not worth parsing
 * when the same data is already sitting in the plain HTML as normal tags.
 *
 * Only the first page of the listing is covered (no pagination).
 */
export async function scrape(): Promise<ScrapeResult> {
  const html = await fetchText(PAGE_URL);
  const events = parseConcerts(html);

  if (events.length === 0) {
    console.warn(`[concertgebouw] No CardEventAndSeries articles found on ${PAGE_URL}. Markup may have changed.`);
  }

  return { source: "concertgebouw", sourceName: "Het Concertgebouw", events };
}

function parseConcerts(html: string): RawEvent[] {
  const $ = cheerio.load(html);
  const events: RawEvent[] = [];

  $('article[data-component="CardEventAndSeries"]').each((_, el) => {
    const item = $(el);
    const link = item.find("a").first();
    const href = link.attr("href");
    const title = item.find("h3.c-content__title").first().text().trim();
    if (!title || !href) return;
    // A cancelled concert renders the same card with a "Cancelled" status
    // label in its footer instead of a price — skip it rather than list an
    // event that isn't actually happening.
    if (/\bCancelled\b/.test(item.find("footer").text())) return;

    const startDate = item.find("time").first().attr("datetime");
    const metaSpans = item
      .find("ul.flex.flex-wrap li.py-1 > span")
      .map((_, s) => $(s).text().trim())
      .get();
    const room = metaSpans[0];
    const priceText = metaSpans.find((t) => t.includes("€"));

    events.push({
      title,
      url: new URL(href, PAGE_URL).toString(),
      venue: room ? `Concertgebouw – ${room}` : "Concertgebouw",
      startDate,
      price: priceText,
    });
  });

  return events;
}
