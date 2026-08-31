import * as cheerio from "cheerio";
import { fetchText } from "../lib/http.js";
import { extractJsonLdEvents } from "../lib/jsonld.js";
import type { RawEvent, ScrapeResult } from "../types.js";

type CheerioEl = ReturnType<cheerio.CheerioAPI>;

const PAGE_URL = "https://www.plukdeliefde.nl/agenda/";

const DUTCH_MONTHS = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

/**
 * plukdeliefde.nl is a Netherlands-wide non-monogamy/poly community site
 * (not Amsterdam-specific), rendered via the WordPress "Content Views"
 * plugin (pt-cv-* classes) with custom fields for place/date/time — not
 * the Tribe Events REST API we originally guessed (verified: 404).
 * Filters down to events whose place field mentions Amsterdam.
 */
export async function scrape(): Promise<ScrapeResult> {
  const html = await fetchText(PAGE_URL);
  const events = parseContentViews(html);

  if (events.length === 0) {
    console.warn(`[plukdeliefde] No .pt-cv-content-item events found on ${PAGE_URL}. Falling back to JSON-LD.`);
    events.push(...extractJsonLdEvents(html, PAGE_URL));
  }

  return { source: "plukdeliefde", sourceName: "Pluk de Liefde", events };
}

function parseContentViews(html: string): RawEvent[] {
  const $ = cheerio.load(html);
  const events: RawEvent[] = [];

  $(".pt-cv-content-item").each((_, el) => {
    const item = $(el);
    const titleLink = item.find(".pt-cv-title a").first();
    const title = titleLink.text().trim();
    const href = titleLink.attr("href");
    if (!title || !href) return;

    const place = ctfValue(item, "plaats");
    if (!place || !/amsterdam/i.test(place)) return;

    const dateText = ctfValue(item, "datum");
    const timeText = ctfValue(item, "tijd");
    const imageUrl = item.find(".pt-cv-thumbnail").first().attr("data-cvpsrc");

    events.push({
      title,
      url: new URL(href, PAGE_URL).toString(),
      description: item.find(".pt-cv-content").first().text().trim() || undefined,
      venue: place,
      imageUrl: imageUrl || undefined,
      startDate: parseDutchDateTime(dateText, timeText),
      dateText: dateText || undefined,
    });
  });

  return events;
}

function ctfValue(item: CheerioEl, field: string): string | undefined {
  const text = item.find(`.pt-cv-ctf-${field} .pt-cv-ctf-value`).first().text().trim();
  return text || undefined;
}

/** Parses "1 september 2026" + "20:00" -> "2026-09-01T20:00:00". */
function parseDutchDateTime(dateText?: string, timeText?: string): string | undefined {
  if (!dateText) return undefined;
  const match = /(\d{1,2})\s+([a-z]+)\s+(\d{4})/i.exec(dateText);
  if (!match) return undefined;
  const [, day, monthName, year] = match;
  const month = DUTCH_MONTHS.indexOf(monthName.toLowerCase());
  if (month === -1) return undefined;
  const datePart = `${year}-${String(month + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
  const time = /^\d{1,2}:\d{2}$/.test(timeText ?? "") ? timeText : "00:00";
  return `${datePart}T${time!.padStart(5, "0")}:00`;
}
