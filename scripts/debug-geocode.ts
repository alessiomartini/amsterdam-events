import { mkdir, writeFile } from "node:fs/promises";
import { geocodeEvents } from "../src/lib/geocode.js";
import type { Event } from "../src/types.js";

// One-off diagnostic: exercise the real geocodeEvents() pipeline (rate
// limiting, caching, Nominatim query shape) against a handful of real
// venues before wiring it into the live scrape. Throwaway, like
// debug-fetch.ts — writes results to debug-html/ for inspection instead
// of touching the real src/data/venue-coords.json cache.
const sample: Event[] = [
  { id: "1", title: "t", url: "https://example.com/1", source: "bimhuis", sourceName: "Bimhuis", categories: [], scrapedAt: "", venue: "Bimhuis" },
  { id: "2", title: "t", url: "https://example.com/2", source: "concertgebouw", sourceName: "Concertgebouw", categories: [], scrapedAt: "", venue: "Concertgebouw" },
  { id: "3", title: "t", url: "https://example.com/3", source: "jazzin", sourceName: "Jazzin", categories: [], scrapedAt: "", venue: "OT301", address: "Overtoom 301, Amsterdam" },
  { id: "4", title: "t", url: "https://example.com/4", source: "radar-squat", sourceName: "Radar", categories: [], scrapedAt: "", address: "Buikslotermeerplein, Amsterdam" },
  { id: "5", title: "t", url: "https://example.com/5", source: "operaballet", sourceName: "Opera & Ballet", categories: [], scrapedAt: "", venue: "Dutch National Opera & Ballet – Main Stage" },
  { id: "6", title: "t", url: "https://example.com/6", source: "jazzin", sourceName: "Jazzin", categories: [], scrapedAt: "", venue: "totally-fake-venue-that-does-not-exist-xyz123" },
];

async function main() {
  await geocodeEvents(sample);
  const outDir = new URL("../debug-html/", import.meta.url).pathname;
  await mkdir(outDir, { recursive: true });
  const results = sample.map((e) => ({ venue: e.venue, address: e.address, lat: e.lat, lon: e.lon }));
  console.log(JSON.stringify(results, null, 2));
  await writeFile(`${outDir}geocode-result.json`, JSON.stringify(results, null, 2), "utf8");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
