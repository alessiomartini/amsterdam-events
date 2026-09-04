import { describe, expect, it } from "vitest";
import { parseEventList } from "../src/scrapers/radar-squat.js";

const PAGE_URL = "https://radar.squat.net/en/events/city/Amsterdam";

// Fragments mirror the real RDFa-annotated markup verified against pages
// the user saved directly from the live site (radar.squat.net has no
// JSON-LD at all, checked across those 3 pages).
function wrap(articles: string): string {
  return `<div class="view-content">${articles}</div>`;
}

describe("radar-squat event list parsing", () => {
  it("extracts title, venue, address, dates, and tags from a full entry", () => {
    const html = wrap(`
      <article>
        <h4 class="event-list-event-title" property="schema:name"><a href="/en/event/amsterdam/cafe-gilde/2026-09-04/lunch-cafe-gilde" property="url">Lunch at Café Gilde</a></h4>
        <span class="group"> ~ <span property="schema:organizer" typeof="Organization"><a href="/en/amsterdam/cafe-gilde" property="schema:url"><span property="schema:name">Café Gilde</span></a></span></span>
        <div class="grey" property="location" typeof="Place"><span property="name">OT301</span>, <span property="address" typeof="PostalAddress"><span property="streetAddress">Overtoom 301</span>, <span property="addressLocality">Amsterdam</span></span></div>
        <span class="date-display-single"><span class="date-display-range"><span class="date-display-start" property="schema:startDate" datatype="xsd:dateTime" content="2026-09-04T12:00:00+02:00">12:00</span> to <span class="date-display-end" property="schema:endDate" datatype="xsd:dateTime" content="2026-09-04T17:00:00+02:00">17:00</span></span></span>
         — bar/cafe / food
      </article>
    `);
    const events = parseEventList(html, PAGE_URL);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      title: "Lunch at Café Gilde",
      url: "https://radar.squat.net/en/event/amsterdam/cafe-gilde/2026-09-04/lunch-cafe-gilde",
      venue: "OT301",
      address: "Overtoom 301, Amsterdam",
      startDate: "2026-09-04T12:00:00+02:00",
      endDate: "2026-09-04T17:00:00+02:00",
      tags: ["bar/cafe", "food"],
    });
  });

  it("keeps the internal slash in a compound tag name instead of splitting on every /", () => {
    const html = wrap(`
      <article>
        <h4 class="event-list-event-title" property="schema:name"><a href="/en/event/x" property="url">Infocafe Bollox</a></h4>
        <div class="grey" property="location" typeof="Place"><span property="name">Infokafee Bollox</span>, <span property="address" typeof="PostalAddress"><span property="streetAddress">Eerste Schinkelstraat 14-16</span>, <span property="addressLocality">Amsterdam</span></span></div>
        <span class="date-display-single" property="schema:startDate" datatype="xsd:dateTime" content="2026-09-04T14:00:00+02:00">14:00</span>
         — bar/cafe / book shop/info shop/library
      </article>
    `);
    const events = parseEventList(html, PAGE_URL);
    expect(events[0].tags).toEqual(["bar/cafe", "book shop/info shop/library"]);
  });

  it("falls back to address-only when there's no named venue (e.g. an outdoor spot)", () => {
    const html = wrap(`
      <article>
        <h4 class="event-list-event-title" property="schema:name"><a href="/en/node/587924" property="url">Vlaggen voor Palestina - Noord</a></h4>
        <div class="grey" property="location" typeof="Place"><span property="address" typeof="PostalAddress"><span property="streetAddress">Buikslotermeerplein</span>, <span property="addressLocality">Amsterdam</span></span></div>
        <span class="date-display-single"><span class="date-display-range"><span class="date-display-start" property="schema:startDate" datatype="xsd:dateTime" content="2026-09-05T14:00:00+02:00">14:00</span> to <span class="date-display-end" property="schema:endDate" datatype="xsd:dateTime" content="2026-09-05T16:30:00+02:00">16:30</span></span></span>
         — action/protest/camp / meeting
      </article>
    `);
    const events = parseEventList(html, PAGE_URL);
    expect(events[0].venue).toBeUndefined();
    expect(events[0].address).toBe("Buikslotermeerplein, Amsterdam");
  });

  it("skips an article with no title link", () => {
    const html = wrap(`<article><div class="grey" property="location"></div></article>`);
    expect(parseEventList(html, PAGE_URL)).toHaveLength(0);
  });

  it("resolves a relative href against the page URL", () => {
    const html = wrap(`
      <article>
        <h4 class="event-list-event-title" property="schema:name"><a href="/en/event/amsterdam/x/y" property="url">Some Event</a></h4>
        <span class="date-display-single" property="schema:startDate" datatype="xsd:dateTime" content="2026-09-06T10:00:00+02:00">10:00</span>
      </article>
    `);
    const events = parseEventList(html, `${PAGE_URL}?page=2`);
    expect(events[0].url).toBe("https://radar.squat.net/en/event/amsterdam/x/y");
  });
});
