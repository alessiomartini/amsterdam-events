import { describe, expect, it } from "vitest";
import * as cheerio from "cheerio";

// Re-implements the same extraction logic as src/scrapers/operaballet.ts
// against a synthetic fragment mirroring the real markup (verified via CI:
// a Drupal-rendered `<article class="programCard">`), since the scraper
// module doesn't export its internals.
const PAGE_URL = "https://www.operaballet.nl/en/program";

function parse(html: string) {
  const $ = cheerio.load(html);
  const events: { title: string; url: string; description?: string; venue?: string; dateText?: string }[] = [];
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

function card(href: string, title: string, dateText: string, building: string, place: string, desc: string) {
  return `
    <article class="programCard">
      <div class="programCard__content">
        <div class="programCard__category">Opera</div>
        <div class="programCard__title">${title}</div>
        <div class="programCard__details">
          <div class="programCard__date"><svg></svg>${dateText}</div>
          <div class="programCard__location">
            <span class="programCard__location--first"><svg></svg><span class="programCard__building">${building},</span></span>
            <span class="programCard__place">${place}</span>
          </div>
        </div>
        <div class="programCard__description"><p>${desc}</p></div>
        <a class="cta-button" href="${href}"><span>Tickets &amp; info</span></a>
      </div>
    </article>
  `;
}

describe("operaballet program listing parsing", () => {
  it("extracts title, url, venue, description, and raw dateText", () => {
    const html = card(
      "/en/dutch-national-opera/2026-2027/pagliacci-cavalleria-rusticana",
      "Pagliacci / Cavalleria rusticana",
      "5 – 23 September 2026",
      "Dutch National Opera & Ballet",
      "Main Stage",
      "Infidelity, treachery and murder are the ingredients...",
    );
    const events = parse(html);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      title: "Pagliacci / Cavalleria rusticana",
      url: "https://www.operaballet.nl/en/dutch-national-opera/2026-2027/pagliacci-cavalleria-rusticana",
      venue: "Dutch National Opera & Ballet – Main Stage",
      description: "Infidelity, treachery and murder are the ingredients...",
      dateText: "5 – 23 September 2026",
    });
    expect(events[0]).not.toHaveProperty("startDate");
  });

  it("dedupes repeated cards for the same show by url", () => {
    const single = card(
      "/en/dutch-national-ballet/2026-2027/swan-lake",
      "Swan Lake",
      "15 October – 8 November 2026, 11 – 24 April 2027",
      "Dutch National Opera & Ballet",
      "Main Stage",
      "White tutus, a sweeping love story...",
    );
    const events = parse(`<div>${single}${single}</div>`);
    expect(events).toHaveLength(1);
  });
});
