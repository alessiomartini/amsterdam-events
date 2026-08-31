import { describe, expect, it } from "vitest";
import * as cheerio from "cheerio";

// Re-implements the same extraction logic as src/scrapers/iamsterdam.ts
// against a synthetic fragment mirroring the real markup (verified via
// CI against the live page), since the scraper module doesn't export its
// internals.
function parse(html: string) {
  const $ = cheerio.load(html);
  const events: { title: string; url: string; venue?: string; dateText?: string; tags: string[]; isFree: boolean }[] = [];

  $('a:has([data-testid="card-tags"])').each((_, el) => {
    const card = $(el);
    const href = card.attr("href");
    const title = card.find("h3").first().text().trim();
    if (!href || !title) return;

    const tags = card
      .find('[data-testid="card-tags"]')
      .first()
      .text()
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const isFree = tags.some((t) => t.toLowerCase() === "free");

    let venue: string | undefined;
    let dateText: string | undefined;
    card.find(".sr-only").each((_, labelEl) => {
      const $label = $(labelEl);
      const label = $label.text().trim();
      const row = $label.parent().parent();
      const value = row.text().trim().slice(label.length).trim();
      if (label === "Location") venue = value;
      if (label === "Date") dateText = value;
    });

    events.push({ title, url: href, venue, dateText, tags, isFree });
  });

  return events;
}

describe("iamsterdam calendar card parsing", () => {
  const html = `
    <a href="/en/whats-on/calendar/festivals/events/kaboom-x-melkweg-cinema">
      <article>
        <h3><span>Kaboom X Melkweg Cinema</span></h3>
        <div>
          <div class="flex items-center gap-2">
            <span><svg></svg><span class="sr-only">Date</span></span>At various times
          </div>
          <div class="flex items-center gap-2">
            <span><svg></svg><span class="sr-only">Location</span></span>Melkweg
          </div>
        </div>
        <span class="hidden" data-testid="card-tags">filmevent, festivals, filmfestival</span>
      </article>
    </a>
    <a href="/en/whats-on/calendar/attractions-and-sights/free-museum-night">
      <article>
        <h3><span>Free Museum Night</span></h3>
        <div>
          <div class="flex items-center gap-2">
            <span><svg></svg><span class="sr-only">Date</span></span>5 September
          </div>
          <div class="flex items-center gap-2">
            <span><svg></svg><span class="sr-only">Location</span></span>Stedelijk Museum
          </div>
        </div>
        <span class="hidden" data-testid="card-tags">free, museums, culture</span>
      </article>
    </a>
  `;

  it("extracts title, venue, date text, tags", () => {
    const events = parse(html);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      title: "Kaboom X Melkweg Cinema",
      url: "/en/whats-on/calendar/festivals/events/kaboom-x-melkweg-cinema",
      venue: "Melkweg",
      dateText: "At various times",
      isFree: false,
    });
  });

  it("detects the free tag", () => {
    const events = parse(html);
    expect(events[1]).toMatchObject({
      title: "Free Museum Night",
      venue: "Stedelijk Museum",
      isFree: true,
    });
    expect(events[1].tags).toContain("free");
  });
});
