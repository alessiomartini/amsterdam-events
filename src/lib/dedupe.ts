import { createHash } from "node:crypto";
import type { Event, RawEvent, ScrapeResult } from "../types.js";
import { categorize } from "./categorize.js";

/** Deterministic id from source + best-available natural key, so repeated scrapes produce stable ids. */
export function makeId(source: string, raw: RawEvent): string {
  const key = raw.sourceId ?? `${raw.url}|${raw.startDate ?? raw.dateText ?? ""}`;
  const hash = createHash("sha1").update(`${source}:${key}`).digest("hex").slice(0, 16);
  return `${source}-${hash}`;
}

export function toEvents(result: ScrapeResult, scrapedAt: string): Event[] {
  return result.events.map((raw) => ({
    ...raw,
    id: makeId(result.source, raw),
    source: result.source,
    sourceName: result.sourceName,
    categories: categorize(result.source, raw),
    scrapedAt,
  }));
}

/**
 * Cross-source dedup: two events are considered the same if they share a
 * normalized title and start date (common when e.g. the same club night is
 * listed on both RA and its promoter page). Keeps the first occurrence and
 * merges categories from the dropped duplicate into the survivor.
 */
export function dedupe(events: Event[]): Event[] {
  const byKey = new Map<string, Event>();
  const order: string[] = [];

  for (const event of events) {
    const key = fuzzyKey(event);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, event);
      order.push(key);
      continue;
    }
    existing.categories = [...new Set([...existing.categories, ...event.categories])];
  }

  return order.map((key) => byKey.get(key)!);
}

function fuzzyKey(event: Event): string {
  const normalizedTitle = event.title
    .toLowerCase()
    .normalize("NFKD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const day = event.startDate?.slice(0, 10) ?? event.dateText ?? "";
  return `${normalizedTitle}|${day}`;
}
