import { mkdir, writeFile } from "node:fs/promises";
import { fetchText } from "../src/lib/http.js";

// One-off diagnostic: fetch raw HTML for a set of source URLs and dump it
// (this repo's dev sandbox has no outbound network access to these sites —
// this only works from CI/local). Edit TARGETS below when a scraper starts
// returning zero events and needs its markup re-inspected.
const TARGETS: Record<string, string> = {
  jazzin: "https://jazzin.amsterdam/",
  knit: "https://knit.amsterdam/events",
  playpartners: "https://www.playpartners.nl/events",
  plukdeliefde: "https://www.plukdeliefde.nl/agenda/",
  radar: "https://radar.squat.net/en/events/city/Amsterdam",
  iamsterdam: "https://www.iamsterdam.com/en/whats-on/calendar",
};

async function main() {
  const outDir = new URL("../debug-html/", import.meta.url).pathname;
  await mkdir(outDir, { recursive: true });

  for (const [name, url] of Object.entries(TARGETS)) {
    try {
      const html = await fetchText(url);
      await writeFile(`${outDir}${name}.html`, html, "utf8");
      console.log(`[${name}] OK, ${html.length} bytes`);
    } catch (err) {
      console.log(`[${name}] FAILED: ${(err as Error).message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
