import * as cheerio from "cheerio";
import type { RawEvent } from "../types.js";

/**
 * Many event sites embed schema.org Event markup as JSON-LD for SEO
 * (<script type="application/ld+json">...). It's the most reliable way to
 * pull structured data out of a page without depending on that site's CSS
 * classes, which change without notice and which we can't verify live from
 * this sandbox. This walks all JSON-LD blocks on a page (including ones
 * nested in @graph or ItemList) and returns every schema.org Event found.
 */
export function extractJsonLdEvents(html: string, pageUrl: string): RawEvent[] {
  const $ = cheerio.load(html);
  const events: RawEvent[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw?.trim()) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    for (const node of flatten(parsed)) {
      const ev = nodeToEvent(node, pageUrl);
      if (ev) events.push(ev);
    }
  });

  return events;
}

/** Recursively unwrap @graph / ItemList / arrays into a flat list of nodes. */
function flatten(node: unknown): Record<string, unknown>[] {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (!node || typeof node !== "object") return [];
  const obj = node as Record<string, unknown>;
  const out: Record<string, unknown>[] = [obj];
  if (Array.isArray(obj["@graph"])) out.push(...flatten(obj["@graph"]));
  if (Array.isArray(obj.itemListElement)) out.push(...flatten(obj.itemListElement));
  if (obj.item && typeof obj.item === "object") out.push(...flatten(obj.item));
  return out;
}

function nodeToEvent(
  node: Record<string, unknown>,
  pageUrl: string,
): RawEvent | undefined {
  const type = node["@type"];
  const isEvent =
    type === "Event" ||
    (Array.isArray(type) && type.includes("Event")) ||
    (typeof type === "string" && type.endsWith("Event"));
  if (!isEvent) return undefined;

  const title = str(node.name);
  if (!title) return undefined;

  const url = str(node.url) || pageUrl;
  const location = node.location as Record<string, unknown> | undefined;
  const address = location?.address as Record<string, unknown> | string | undefined;
  const venue = str(location?.name);
  const addressText =
    typeof address === "string"
      ? address
      : [str(address?.streetAddress), str(address?.addressLocality)]
          .filter(Boolean)
          .join(", ");

  const offers = node.offers as
    | Record<string, unknown>
    | Record<string, unknown>[]
    | undefined;
  const offer = Array.isArray(offers) ? offers[0] : offers;
  const price = offer ? formatOffer(offer) : undefined;

  const image = node.image;
  const imageUrl = Array.isArray(image) ? str(image[0]) : str(image);

  return {
    title,
    description: str(node.description),
    url,
    imageUrl,
    venue,
    address: addressText || undefined,
    startDate: str(node.startDate),
    endDate: str(node.endDate),
    price,
    isFree: price ? /^(0([.,]0+)?\s*(eur|€)?|free|gratis)$/i.test(price.trim()) : undefined,
  };
}

function formatOffer(offer: Record<string, unknown>): string | undefined {
  const price = offer.price;
  const currency = str(offer.priceCurrency) ?? "EUR";
  if (price === 0 || price === "0" || price === "0.00") return "Free";
  if (price !== undefined && price !== null && price !== "") {
    return `${price} ${currency}`.trim();
  }
  return undefined;
}

function str(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}
