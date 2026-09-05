import { readFile, writeFile } from "node:fs/promises";
import type { Event } from "../types.js";

const CACHE_PATH = new URL("../data/venue-coords.json", import.meta.url).pathname;
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
// Nominatim's usage policy (https://operations.osmfoundation.org/policies/nominatim/)
// requires a descriptive User-Agent identifying the application (a generic
// browser UA can get blocked) and at most 1 request/second.
const USER_AGENT = "amsterdam-events-bot/0.1 (+https://github.com/) geocoding-for-static-site";
const RATE_LIMIT_MS = 1100;

type Coords = { lat: number; lon: number };
type CoordsCache = Record<string, Coords | null>;

interface NominatimResult {
  lat: string;
  lon: string;
}

/**
 * Attaches lat/lon to events (mutates in place) based on venue/address,
 * geocoded via Nominatim (OpenStreetMap's free geocoder, no API key
 * needed). Results are cached in src/data/venue-coords.json, committed to
 * the repo alongside data/events.json, so a given venue is only ever
 * geocoded once — later runs only look up venues not already in the
 * cache, which is what Nominatim's usage policy (max 1 req/s, don't
 * re-request things you already know) actually requires. A failed lookup
 * is cached as `null` too, so it isn't retried indefinitely every run.
 *
 * Keyed by venue name alone (not the full address) when available: the
 * same venue can show up with slightly different address formatting
 * across sources, and venue name is the more stable identifier — the
 * query sent to Nominatim itself still includes the address when known,
 * for accuracy, just not the cache key.
 */
export async function geocodeEvents(events: Event[]): Promise<void> {
  const cache = await loadCache();
  const toLookup = new Set<string>();
  for (const event of events) {
    const key = locationKey(event);
    if (key && !(key in cache)) toLookup.add(key);
  }

  if (toLookup.size > 0) {
    console.log(`[geocode] Looking up ${toLookup.size} new venue(s) via Nominatim...`);
    const byKey = new Map<string, Event>();
    for (const event of events) {
      const key = locationKey(event);
      if (key && !byKey.has(key)) byKey.set(key, event);
    }

    for (const key of toLookup) {
      const sample = byKey.get(key)!;
      try {
        cache[key] = await geocodeOne(geocodeQuery(sample));
      } catch (err) {
        console.warn(`[geocode] Failed for "${key}": ${(err as Error).message}`);
        cache[key] = null;
      }
      await sleep(RATE_LIMIT_MS);
    }

    await saveCache(cache);
  }

  for (const event of events) {
    const key = locationKey(event);
    const coords = key ? cache[key] : undefined;
    if (coords) {
      event.lat = coords.lat;
      event.lon = coords.lon;
    }
  }
}

export function locationKey(event: Event): string | undefined {
  return event.venue?.trim() || event.address?.trim() || undefined;
}

export function geocodeQuery(event: Event): string {
  const parts = [event.venue?.trim(), event.address?.trim()].filter((p): p is string => Boolean(p));
  const query = parts.join(", ");
  return /amsterdam/i.test(query) ? query : `${query}, Amsterdam`;
}

async function geocodeOne(query: string): Promise<Coords | null> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

  const results = (await res.json()) as NominatimResult[];
  const first = results[0];
  if (!first) return null;

  const lat = parseFloat(first.lat);
  const lon = parseFloat(first.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return { lat, lon };
}

async function loadCache(): Promise<CoordsCache> {
  try {
    return JSON.parse(await readFile(CACHE_PATH, "utf8")) as CoordsCache;
  } catch {
    return {};
  }
}

async function saveCache(cache: CoordsCache): Promise<void> {
  const sorted = Object.fromEntries(
    Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)),
  );
  await writeFile(CACHE_PATH, JSON.stringify(sorted, null, 2) + "\n", "utf8");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
