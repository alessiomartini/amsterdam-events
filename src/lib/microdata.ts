import * as cheerio from "cheerio";
import type { RawEvent } from "../types.js";

type CheerioEl = ReturnType<cheerio.CheerioAPI>;

/**
 * Some sites mark up events with schema.org Microdata (itemscope/itemtype/
 * itemprop attributes) instead of JSON-LD — e.g. jazzin.amsterdam renders
 * <tr itemscope itemtype="https://schema.org/Event"> rows server-side.
 * This walks every element whose itemtype ends in "/Event" and reads its
 * itemprop children, the same way extractJsonLdEvents reads JSON-LD.
 */
export function extractMicrodataEvents(html: string, pageUrl: string): RawEvent[] {
  const $ = cheerio.load(html);
  const events: RawEvent[] = [];

  $('[itemtype$="schema.org/Event"], [itemtype$="schema.org/Event/"]').each((_, el) => {
    const scope = $(el);
    const title = itemPropText($, scope, "name");
    if (!title) return;

    const url = itemPropAttr($, scope, "url", "href") ?? pageUrl;
    const startDate = itemPropAttr($, scope, "startDate", "datetime") ?? itemPropText($, scope, "startDate");
    const endDate = itemPropAttr($, scope, "endDate", "datetime") ?? itemPropText($, scope, "endDate");

    const locationScope = findItemProp($, scope, "location");
    const venue = locationScope ? itemPropText($, locationScope, "name") : undefined;

    events.push({
      title,
      url: new URL(url, pageUrl).toString(),
      startDate,
      endDate,
      venue,
      description: itemPropText($, scope, "description"),
    });
  });

  return events;
}

function findItemProp(
  $: cheerio.CheerioAPI,
  scope: CheerioEl,
  prop: string,
): CheerioEl | undefined {
  const found = scope.find(`[itemprop="${prop}"]`).first();
  return found.length ? found : undefined;
}

function itemPropText(
  $: cheerio.CheerioAPI,
  scope: CheerioEl,
  prop: string,
): string | undefined {
  const el = findItemProp($, scope, prop);
  const text = el?.text().trim();
  return text || undefined;
}

function itemPropAttr(
  $: cheerio.CheerioAPI,
  scope: CheerioEl,
  prop: string,
  attr: string,
): string | undefined {
  const el = findItemProp($, scope, prop);
  const value = el?.attr(attr)?.trim();
  return value || undefined;
}
