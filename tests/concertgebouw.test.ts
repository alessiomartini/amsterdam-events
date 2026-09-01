import { describe, expect, it } from "vitest";
import * as cheerio from "cheerio";

// Re-implements the same extraction logic as src/scrapers/concertgebouw.ts
// against a synthetic fragment mirroring the real markup (verified via CI:
// a Nuxt-rendered `<article data-component="CardEventAndSeries">`), since
// the scraper module doesn't export its internals.
const PAGE_URL = "https://www.concertgebouw.nl/en/concerts-and-tickets";

function parse(html: string) {
  const $ = cheerio.load(html);
  const events: { title: string; url: string; venue: string; startDate?: string; price?: string }[] = [];

  $('article[data-component="CardEventAndSeries"]').each((_, el) => {
    const item = $(el);
    const link = item.find("a").first();
    const href = link.attr("href");
    const title = item.find("h3.c-content__title").first().text().trim();
    if (!title || !href) return;
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

function card({
  href,
  title,
  datetime,
  room,
  meta2,
  footer,
}: {
  href: string;
  title: string;
  datetime: string;
  room: string;
  meta2: string;
  footer?: string;
}) {
  return `
    <article data-component="CardEventAndSeries">
      <a href="${href}">
        <section>
          <h3 class="c-content__title">${title}</h3>
          <ul class="flex flex-wrap">
            <li class="py-1"><time datetime="${datetime}">7:30 PM</time></li>
            <li class="py-1"><span>${room}</span></li>
            <li class="py-1"><span>${meta2}</span></li>
          </ul>
          <footer>${footer ?? '<button>More information</button>'}</footer>
        </section>
      </a>
    </article>
  `;
}

describe("concertgebouw concert listing parsing", () => {
  it("extracts title, url, room-qualified venue, startDate and price", () => {
    const html = card({
      href: "/en/concerts/45854079-stars-in-concert",
      title: "Stars in Concert",
      datetime: "2026-09-04T17:30:00.000Z",
      room: "Main Hall",
      meta2: "From €55.00",
    });
    const events = parse(html);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      title: "Stars in Concert",
      url: "https://www.concertgebouw.nl/en/concerts/45854079-stars-in-concert",
      venue: "Concertgebouw – Main Hall",
      startDate: "2026-09-04T17:30:00.000Z",
      price: "From €55.00",
    });
  });

  it("leaves price undefined when the second meta span is a sale notice, not a price", () => {
    const html = card({
      href: "/en/concerts/some-future-concert",
      title: "Some Future Concert",
      datetime: "2026-10-01T19:00:00.000Z",
      room: "Recital Hall",
      meta2: "Sale starts at 10:00",
    });
    const events = parse(html);
    expect(events[0].price).toBeUndefined();
  });

  it("skips cancelled concerts", () => {
    const html = card({
      href: "/en/concerts/cancelled-one",
      title: "Cancelled Concert",
      datetime: "2026-09-05T19:00:00.000Z",
      room: "Main Hall",
      meta2: "From €30.00",
      footer: "<p>Cancelled</p>",
    });
    expect(parse(html)).toHaveLength(0);
  });
});
