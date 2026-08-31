import type { RawEvent, ScrapeResult } from "../types.js";

const SOURCE_URL = "https://www.amsterdamsights.com/events/free-events.html";

/**
 * amsterdamsights.com's "Free Events" page is excluded from automated
 * scraping (see README — Cloudflare actively blocks headless traffic, not
 * a trivial check). Its content, though, isn't a dated event calendar at
 * all: it's a small, evergreen list of standing free activities/attractions
 * around Amsterdam (a free ferry, weekly yoga in a park, a recurring free
 * jazz night, museum gardens open to the public, ...) that barely changes
 * over time.
 *
 * That makes it a reasonable candidate for manual curation instead of
 * scraping: this list was hand-transcribed by reading the page's real
 * content once, legitimately, via the Wayback Machine's public archive
 * (https://web.archive.org/web/20260510181328/http://amsterdamsights.com/events/free-events.html)
 * — not by scraping the live, protected site. It is NOT auto-updated; if
 * it goes stale, re-check the source page (or a fresh archive snapshot)
 * and edit this file directly.
 *
 * Last verified: 2026-08-31, against the archive snapshot dated 2026-05-10.
 */
const RECURRING_FREE_ACTIVITIES: RawEvent[] = [
  {
    sourceId: "flamingos-spoonbills",
    title: "Flamingos and Spoonbills at Artisplein",
    description:
      "Sneak a peek at the pink flamingos and white spoonbills at Artisplein, a freely accessible square next to the entrance to Artis Zoo.",
    url: SOURCE_URL,
    venue: "Artisplein",
    dateText: "Always accessible",
    isFree: true,
    tags: ["outdoor", "animals"],
  },
  {
    sourceId: "melkweg-expo",
    title: "Melkweg Expo",
    description:
      "An exhibition of innovative contemporary photography in a casual setting. Free entrance via MILK café.",
    url: SOURCE_URL,
    venue: "Melkweg",
    dateText: "Tuesday to Sunday, 11:00–23:00",
    isFree: true,
    tags: ["exhibition", "photography"],
  },
  {
    sourceId: "rijksmuseum-gardens",
    title: "Rijksmuseum Gardens",
    description:
      "The Rijksmuseum's gardens are a veritable oasis in which to peacefully enjoy nature at its most beautiful.",
    url: SOURCE_URL,
    venue: "Rijksmuseum",
    dateText: "Daily, 9:00–18:00",
    isFree: true,
    tags: ["museum", "park", "outdoor"],
  },
  {
    sourceId: "lunchtime-concerts-concertgebouw",
    title: "Lunchtime Concerts at The Concertgebouw",
    description: "Free lunch concerts in the beautiful Main Hall of The Concertgebouw.",
    url: SOURCE_URL,
    venue: "The Concertgebouw",
    dateText: "Usually Wednesdays at 12:30",
    isFree: true,
    tags: ["live music", "classical"],
  },
  {
    sourceId: "vondelpark-open-air-theater",
    title: "Vondelpark Open Air Theater",
    description: "Free dance, music and cabaret performances in the park's band shell.",
    url: SOURCE_URL,
    venue: "Vondelpark",
    dateText: "Every weekend, May to September",
    isFree: true,
    tags: ["outdoor", "live music", "park"],
  },
  {
    sourceId: "civic-guards-gallery",
    title: "Civic Guards Gallery",
    description:
      "A public passage-way in the old centre of Amsterdam with enormous 17th-century group portraits of civic guards, plus the world-famous 370-year-old wooden Goliath and David.",
    url: SOURCE_URL,
    venue: "Amsterdam Museum",
    dateText: "Daily, 10:00–17:00",
    isFree: true,
    tags: ["museum", "gallery"],
  },
  {
    sourceId: "yoga-oosterpark",
    title: "Yoga Class in Oosterpark",
    description:
      "Bring a yoga mat or a towel and show up for an hour of yoga at Oosterpark. Led by qualified yoga instructors in English.",
    url: SOURCE_URL,
    venue: "Oosterpark",
    dateText: "Every Sunday at 10:30, May to September",
    isFree: true,
    tags: ["outdoor", "park"],
  },
  {
    sourceId: "nemo-panorama-terrace",
    title: "NEMO's Panorama Terrace",
    description:
      "A 22m high roof terrace reached by climbing the steps of the building — freely accessible to the public, no need to pay NEMO's entrance fee.",
    url: SOURCE_URL,
    venue: "NEMO Science Museum",
    dateText: "Daily during NEMO opening hours, 10:00–17:30",
    isFree: true,
    tags: ["museum", "outdoor"],
  },
  {
    sourceId: "begijnhof",
    title: "Begijnhof",
    description:
      "An enclosed courtyard with two churches and charming houses dating from the early 14th century.",
    url: SOURCE_URL,
    venue: "Begijnhof",
    dateText: "Daily, 9:00–17:00",
    isFree: true,
    tags: ["museum", "historic"],
  },
  {
    sourceId: "ij-ferry",
    title: "Cross the IJ River by Ferry",
    description:
      "Free ferries across the IJ River with a breathtaking view of the former city border and old docklands.",
    url: SOURCE_URL,
    venue: "IJ River ferries",
    dateText: "24 hours a day, various ferry links",
    isFree: true,
    tags: ["outdoor"],
  },
  {
    sourceId: "free-tour-amsterdam",
    title: "Free Tour of Amsterdam",
    description: "A 2½-hour walking tour with an expert guide covering the main sights in the inner city.",
    url: SOURCE_URL,
    venue: "Amsterdam city centre",
    dateText: "Daily, 10:00–15:00",
    isFree: true,
    tags: ["tour", "outdoor"],
  },
  {
    sourceId: "free-organ-concert",
    title: "Free Organ Concert at De Waalse Kerk",
    description:
      "Students of the Conservatory of Amsterdam play the extraordinary Müller organ (built in 1734).",
    url: SOURCE_URL,
    venue: "De Waalse Kerk",
    dateText: "Every 2nd Tuesday of the month, 12:00–12:30",
    isFree: true,
    tags: ["live music", "classical"],
  },
  {
    sourceId: "friday-night-skate",
    title: "Friday Night Skate",
    description: "A skate tour through the streets of Amsterdam.",
    url: SOURCE_URL,
    venue: "Amsterdam (streets)",
    dateText: "Every Friday at 20:15, weather permitting",
    isFree: true,
    tags: ["outdoor"],
  },
  {
    sourceId: "amsterdam-city-archives",
    title: "Amsterdam City Archives",
    description:
      "Browse the city's archives, watch old historic footage of Amsterdam, or see personal objects of famous Amsterdammers on display.",
    url: SOURCE_URL,
    venue: "Stadsarchief Amsterdam",
    dateText: "Daily except Mondays",
    isFree: true,
    tags: ["museum", "history"],
  },
  {
    sourceId: "free-guided-diamond-tour",
    title: "Free Guided Diamond Tour",
    description:
      "Learn about the 4 C's of diamond valuation and the origin of diamonds, and see craftsmen at work. Tours available in 15+ languages.",
    url: SOURCE_URL,
    venue: "Amsterdam diamond factory",
    dateText: "Daily, 9:00–16:30",
    isFree: true,
    tags: ["tour"],
  },
  {
    sourceId: "choral-evensong",
    title: "Choral Evensong at Saint Nicholas Church",
    description: "A traditional Choral Evensong in the tranquil setting of Saint Nicholas Church.",
    url: SOURCE_URL,
    venue: "Saint Nicholas Church",
    dateText: "Every Saturday at 17:00, September to June",
    isFree: true,
    tags: ["live music", "choral"],
  },
  {
    sourceId: "free-jazz-session-bimhuis",
    title: "Free Jazz Session at Bimhuis",
    description:
      "Free admission for musicians and audience alike to a workshop (20:00) and a jam session (22:00) at the café.",
    url: SOURCE_URL,
    venue: "Bimhuis",
    dateText: "Every Tuesday, September to June",
    isFree: true,
    tags: ["jazz", "live music"],
  },
  {
    sourceId: "botanic-garden-zuidas",
    title: "Botanic Garden Zuidas",
    description:
      "Cactus plants over 100 years old and a Chinese Penjing Garden, near VU Amsterdam. Noted as temporarily cancelled as of the May 2026 archive snapshot this entry was sourced from — verify it's running again before relying on it.",
    url: SOURCE_URL,
    venue: "Botanic Garden Zuidas",
    dateText: "Every workday, 9:00–17:00 (check current status)",
    isFree: true,
    tags: ["park", "outdoor"],
  },
  {
    sourceId: "musical-treat-lunch-break",
    title: "Musical Treat During Lunch Break",
    description: "A free lunch concert in the foyer of Dutch National Opera & Ballet.",
    url: SOURCE_URL,
    venue: "Dutch National Opera & Ballet",
    dateText: "Tuesdays at 12:30 (doors 12:15), September to May",
    isFree: true,
    tags: ["live music", "classical"],
  },
];

export async function scrape(): Promise<ScrapeResult> {
  return {
    source: "amsterdamsights-manual",
    sourceName: "AmsterdamSights (curated list)",
    events: RECURRING_FREE_ACTIVITIES,
  };
}
