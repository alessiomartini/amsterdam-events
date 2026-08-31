import { mkdir, writeFile } from "node:fs/promises";
import { fetchText } from "../src/lib/http.js";

// One-off diagnostic: check whether ra.co / amsterdamsights.com publish a
// legitimate RSS/iCal feed (a publicly offered syndication endpoint is a
// different thing entirely from scraping around a WAF/CAPTCHA — if a site
// publishes one, it's meant to be consumed programmatically).
const TARGETS: Record<string, string> = {
  "ra-rss-1": "https://ra.co/xml/events.xml",
  "ra-rss-2": "https://ra.co/rss",
  "ra-rss-3": "https://ra.co/rss/events",
  "ra-rss-4": "https://ra.co/events/nl/amsterdam.rss",
  "ra-rss-5": "https://ra.co/rss/promoter/117681",
  "ra-ical-1": "https://ra.co/promoters/117681/events.ics",
  "sights-rss-1": "https://www.amsterdamsights.com/rss.xml",
  "sights-rss-2": "https://www.amsterdamsights.com/feed",
  "sights-rss-3": "https://www.amsterdamsights.com/events/rss.xml",
  "sights-rss-4": "https://www.amsterdamsights.com/rss/free-events.xml",
};

async function main() {
  const outDir = new URL("../debug-html/", import.meta.url).pathname;
  await mkdir(outDir, { recursive: true });

  for (const [name, url] of Object.entries(TARGETS)) {
    try {
      const html = await fetchText(url, { retries: 0 });
      await writeFile(`${outDir}${name}.html`, html, "utf8");
      console.log(`[${name}] OK, ${html.length} bytes — ${url}`);
    } catch (err) {
      console.log(`[${name}] FAILED: ${(err as Error).message} — ${url}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
