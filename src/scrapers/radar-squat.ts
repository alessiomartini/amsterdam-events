import * as cheerio from "cheerio";
import { fetchText } from "../lib/http.js";
import type { RawEvent, ScrapeResult } from "../types.js";

const BASE_URL = "https://radar.squat.net/en/events/city/Amsterdam";
// Drupal's "Load more" pager returns a fixed-size batch per page (20,
// confirmed across 3 real pages saved by the user) — a page returning
// fewer than that is the last one.
const PAGE_SIZE = 20;
const MAX_PAGES = 15;

/**
 * radar.squat.net is a Drupal-based calendar for squats/social
 * centers/activist events. No JSON-LD (checked across 3 real page saves —
 * zero <script type="application/ld+json"> blocks anywhere), but each
 * listing row is real schema.org-annotated RDFa markup
 * (property="schema:startDate" etc. with a machine-readable `content`
 * attribute) — reliable, no need for the guesswork the old fallback
 * selector did.
 *
 * The listing paginates with a "Load more" link that's a plain URL
 * (?page=1, ?page=2, ...), not JS-only — the user saved pages 0-2 and
 * confirmed each is a distinct, non-overlapping batch of 20 real
 * upcoming events (the old scraper only ever fetched page 0, missing
 * everything past the first 20). Paginates further than MAX_PAGES; this
 * is bounded rather than exhaustive, same as Eventbrite's MAX_PAGES.
 */
export async function scrape(): Promise<ScrapeResult> {
  const events: RawEvent[] = [];
  const seenUrls = new Set<string>();

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = page === 0 ? BASE_URL : `${BASE_URL}?page=${page}`;
    let html: string;
    try {
      html = await fetchText(url);
    } catch (err) {
      console.warn(`[radar-squat] Failed to fetch page ${page}: ${(err as Error).message}`);
      break;
    }

    const pageEvents = parseEventList(html, url);
    for (const event of pageEvents) {
      if (seenUrls.has(event.url)) continue;
      seenUrls.add(event.url);
      events.push(event);
    }

    if (pageEvents.length < PAGE_SIZE) break;
  }

  if (events.length === 0) {
    console.warn(
      `[radar-squat] No events extracted from ${BASE_URL}. Markup may have changed.`,
    );
  }

  return { source: "radar-squat", sourceName: "Radar (squat.net)", events };
}

export function parseEventList(html: string, pageUrl: string): RawEvent[] {
  const $ = cheerio.load(html);
  const events: RawEvent[] = [];

  $(".view-content article").each((_, el) => {
    const article = $(el);
    const titleLink = article.find("h4.event-list-event-title a").first();
    const title = titleLink.text().trim();
    const href = titleLink.attr("href");
    if (!title || !href) return;

    const venue = article.find('[property="location"] [property="name"]').first().text().trim() || undefined;
    const streetAddress = article.find('[property="location"] [property="streetAddress"]').first().text().trim();
    const locality = article.find('[property="location"] [property="addressLocality"]').first().text().trim();
    const address = [streetAddress, locality].filter(Boolean).join(", ") || undefined;

    const startDate = article.find('[property="schema:startDate"]').first().attr("content");
    const endDate = article.find('[property="schema:endDate"]').first().attr("content");
    const tags = extractTags(article);

    events.push({
      title,
      url: new URL(href, pageUrl).toString(),
      venue,
      address,
      startDate,
      endDate,
      tags: tags.length > 0 ? tags : undefined,
    });
  });

  return events;
}

/**
 * The category line(s) after the date ("— bar/cafe / food", sometimes a
 * second "— Outdoor screening" line) are plain text nodes directly inside
 * the article, not wrapped in their own element. Individual tags are
 * separated by " / " — note some tag names have their own internal "/"
 * ("bar/cafe", "music/concert"), so splitting on bare "/" would mangle
 * them; only the em-dash-delimited segments and " / "-separated tags
 * within them are split.
 */
function extractTags(article: ReturnType<cheerio.CheerioAPI>): string[] {
  const rawText = article
    .contents()
    .filter((_, node) => node.type === "text")
    .text();

  return rawText
    .split("—")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .flatMap((segment) =>
      segment
        .split(" / ")
        .map((tag) => tag.trim())
        .filter(Boolean),
    );
}
