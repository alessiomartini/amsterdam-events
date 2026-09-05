import { runAllScrapers } from "./scrapers/index.js";
import { dedupe, toEvents } from "./lib/dedupe.js";
import { geocodeEvents } from "./lib/geocode.js";
import { writeEvents } from "./lib/store.js";

const OUT_PATH = new URL("../data/events.json", import.meta.url).pathname;

async function main() {
  const scrapedAt = new Date().toISOString();
  console.log("Running scrapers...");
  const results = await runAllScrapers();

  const allEvents = results.flatMap((r) => toEvents(r, scrapedAt));
  const deduped = dedupe(allEvents);

  await geocodeEvents(deduped);

  await writeEvents(OUT_PATH, deduped);

  console.log("\nSummary:");
  for (const r of results) {
    const status = r.error ? `ERROR: ${r.error}` : `${r.events.length} events`;
    console.log(`  ${r.sourceName.padEnd(32)} ${status}`);
  }
  console.log(`\nWrote ${deduped.length} deduplicated events to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
