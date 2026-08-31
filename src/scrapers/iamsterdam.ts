import * as cheerio from "cheerio";
import { fetchText } from "../lib/http.js";
import type { RawEvent, ScrapeResult } from "../types.js";

const PAGE_URL = "https://www.iamsterdam.com/en/whats-on/calendar";

/**
 * iamsterdam.com is the city's official tourism board site — no bot
 * protection at all (verified: plain fetch gets a clean 200). Used as a
 * replacement for amsterdamsights.com's free-events page, which is
 * excluded (see README) for sitting behind Cloudflare that actively blocks
 * automated traffic. Its /whats-on/calendar page server-renders full event
 * cards (verified against real markup): each is an
 * <a href="/en/whats-on/calendar/.../events/<slug>"> wrapping an <article>
 * with a title, a "Date"/"Location" icon row (free text, not always ISO —
 * kept as dateText), and a hidden `[data-testid="card-tags"]` span with a
 * comma-separated tag list that includes a literal "free" token for
 * free-entry events.
 *
 * This is a single page fetch (the calendar likely paginates further than
 * what's shown here) — good initial coverage, not exhaustive.
 */
export async function scrape(): Promise<ScrapeResult> {
  const html = await fetchText(PAGE_URL);
  const events = parseCalendar(html);

  if (events.length === 0) {
    console.warn(`[iamsterdam] No event cards found on ${PAGE_URL}. Markup may have changed.`);
  }

  return { source: "iamsterdam", sourceName: "I amsterdam", events };
}

function parseCalendar(html: string): RawEvent[] {
  const $ = cheerio.load(html);
  const events: RawEvent[] = [];

  $('a:has([data-testid="card-tags"])').each((_, el) => {
    const card = $(el);
    const href = card.attr("href");
    const title = card.find("h3").first().text().trim();
    if (!href || !title) return;

    const tagsText = card.find('[data-testid="card-tags"]').first().text();
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const isFree = tags.some((t) => t.toLowerCase() === "free");

    const venue = fieldAfterLabel($, card, "Location");
    const dateText = fieldAfterLabel($, card, "Date");

    const rawSrc = card.find("img").first().attr("src");
    const imageUrl = rawSrc ? decodeNextImageUrl(rawSrc) : undefined;

    events.push({
      title,
      url: new URL(href, PAGE_URL).toString(),
      venue,
      dateText,
      tags,
      isFree,
      imageUrl,
    });
  });

  return events;
}

/**
 * Each info row looks like:
 *   <div class="flex items-center gap-2">
 *     <span><svg/><span class="sr-only">Date</span></span>At various times
 *   </div>
 * The label lives in a `.sr-only` span (for accessibility); the visible
 * text is a sibling text node in the same outer row. We find the row by
 * its `.sr-only` label text, then strip that label off the row's full text.
 */
function fieldAfterLabel(
  $: cheerio.CheerioAPI,
  card: ReturnType<cheerio.CheerioAPI>,
  label: string,
): string | undefined {
  let result: string | undefined;
  card.find(".sr-only").each((_, labelEl) => {
    if (result) return;
    const $label = $(labelEl);
    if ($label.text().trim() !== label) return;
    const row = $label.parent().parent();
    const rowText = row.text().trim();
    const value = rowText.startsWith(label) ? rowText.slice(label.length).trim() : rowText;
    result = value || undefined;
  });
  return result;
}

function decodeNextImageUrl(src: string): string {
  try {
    const url = new URL(src, PAGE_URL);
    const original = url.searchParams.get("url");
    return original ?? src;
  } catch {
    return src;
  }
}
