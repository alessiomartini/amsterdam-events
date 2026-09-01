import { describe, expect, it } from "vitest";
import * as cheerio from "cheerio";

// Re-implements the same extraction logic as src/scrapers/bimhuis.ts against
// a synthetic fragment mirroring the real markup (verified via CI): a
// Next.js Suspense stream where several empty skeleton
// `<li class="agenda-tile-overview__item">` copies sit alongside the real,
// already-resolved one — since the scraper module doesn't export internals.
const PAGE_URL = "https://www.bimhuis.nl/en/calendar";

function parse(html: string) {
  const $ = cheerio.load(html);
  const events: { title: string; url: string; description?: string; venue: string; startDate?: string }[] = [];
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

describe("bimhuis calendar parsing", () => {
  const skeleton = `
    <li class="agenda-tile-overview__item">
      <div class="agenda-tile"><div class="agenda-tile__content"><div>
        <time class="agenda-tile__dates"></time>
        <div><a class="agenda-tile__link" href=""><h3></h3></a></div>
      </div></div></div>
    </li>
  `;
  const real = `
    <li class="agenda-tile-overview__item">
      <div class="agenda-tile"><div class="agenda-tile__content"><div>
        <time class="agenda-tile__dates" datetime="2026-09-03">Thu 3 September 2026<span>20:30</span></time>
        <div>
          <a class="agenda-tile__link" href="https://www.bimhuis.nl/en/calendar/joanne-robertson/"><h3>Joanne Robertson + S*an D. Henry-Smith</h3></a>
          <p>Expressionistic singer and guitarist moves between songs and improvisation.</p>
        </div>
      </div></div></div>
    </li>
  `;
  // The same real item appears a second time elsewhere in the stream, as it
  // genuinely does on the live page (once resolved, once in a Suspense
  // boundary reference) — the scraper must dedupe by URL.
  const html = `<ul>${skeleton}${real}${real}${skeleton}</ul>`;

  it("skips empty skeleton items and dedupes the real one by URL", () => {
    const events = parse(html);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      title: "Joanne Robertson + S*an D. Henry-Smith",
      url: "https://www.bimhuis.nl/en/calendar/joanne-robertson/",
      description: "Expressionistic singer and guitarist moves between songs and improvisation.",
      venue: "Bimhuis",
      startDate: "2026-09-03T20:30:00",
    });
  });

  it("falls back to midnight when there's no time-of-day span", () => {
    const noTime = `
      <li class="agenda-tile-overview__item">
        <div class="agenda-tile"><div class="agenda-tile__content"><div>
          <time class="agenda-tile__dates" datetime="2026-09-10">Thu 10 September 2026</time>
          <div><a class="agenda-tile__link" href="https://www.bimhuis.nl/en/calendar/all-day-thing/"><h3>All Day Thing</h3></a></div>
        </div></div></div>
      </li>
    `;
    const events = parse(`<ul>${noTime}</ul>`);
    expect(events[0].startDate).toBe("2026-09-10T00:00:00");
  });
});
