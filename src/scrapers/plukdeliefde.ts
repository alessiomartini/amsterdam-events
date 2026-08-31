import { fetchJson, fetchText } from "../lib/http.js";
import { extractJsonLdEvents } from "../lib/jsonld.js";
import type { RawEvent, ScrapeResult } from "../types.js";

const PAGE_URL = "https://www.plukdeliefde.nl/agenda/";
// plukdeliefde.nl runs WordPress with "The Events Calendar" plugin, which
// exposes a stable public REST API — much more robust than scraping HTML.
const API_URL =
  "https://www.plukdeliefde.nl/wp-json/tribe/events/v1/events?per_page=50";

interface TribeEvent {
  id: number;
  title: string;
  description?: string;
  url: string;
  image?: { url?: string } | false;
  venue?: { venue?: string; address?: string; city?: string };
  start_date?: string;
  end_date?: string;
  cost?: string;
  cost_details?: { values?: number[] };
}

interface TribeResponse {
  events?: TribeEvent[];
}

export async function scrape(): Promise<ScrapeResult> {
  try {
    const data = await fetchJson<TribeResponse>(API_URL);
    const events = (data.events ?? []).map(tribeToRaw);
    if (events.length > 0) {
      return { source: "plukdeliefde", sourceName: "Pluk de Liefde", events };
    }
  } catch (err) {
    console.warn(`[plukdeliefde] Tribe Events REST API failed: ${(err as Error).message}`);
  }

  // Fallback: JSON-LD on the agenda page, in case the plugin/API changed.
  const html = await fetchText(PAGE_URL);
  const events = extractJsonLdEvents(html, PAGE_URL);
  if (events.length === 0) {
    console.warn(`[plukdeliefde] No events found via API or JSON-LD on ${PAGE_URL}.`);
  }
  return { source: "plukdeliefde", sourceName: "Pluk de Liefde", events };
}

function tribeToRaw(ev: TribeEvent): RawEvent {
  const isFree = /^(gratis|free|0)([.,]0+)?$/i.test((ev.cost ?? "").trim());
  return {
    sourceId: String(ev.id),
    title: stripHtml(ev.title),
    description: ev.description ? stripHtml(ev.description) : undefined,
    url: ev.url,
    imageUrl: ev.image ? ev.image.url : undefined,
    venue: ev.venue?.venue,
    address: [ev.venue?.address, ev.venue?.city].filter(Boolean).join(", ") || undefined,
    startDate: ev.start_date ? toIso(ev.start_date) : undefined,
    endDate: ev.end_date ? toIso(ev.end_date) : undefined,
    price: ev.cost || undefined,
    isFree,
  };
}

function toIso(tribeDate: string): string {
  // Tribe dates look like "2026-09-05 20:00:00" in site-local time.
  return tribeDate.replace(" ", "T");
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, "").trim();
}
