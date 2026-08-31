import { mkdir, writeFile } from "node:fs/promises";
import { fetchText } from "../src/lib/http.js";

// One-off diagnostic: fetch raw HTML for sources whose scraper found zero
// events, so we can inspect real markup (this repo's dev sandbox has no
// outbound network access to these sites — this only works from CI/local).
const TARGETS: Record<string, string> = {
  jazzin: "https://jazzin.amsterdam/",
  knit: "https://knit.amsterdam/events",
  playpartners: "https://www.playpartners.nl/events",
  plukdeliefde: "https://www.plukdeliefde.nl/agenda/",
  eventbrite: "https://www.eventbrite.com/d/netherlands--amsterdam/free--film-and-media--events/",
  "ra-amsterdam": "https://ra.co/events/nl/amsterdam",
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
