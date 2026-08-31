import { mkdir, writeFile } from "node:fs/promises";
import { fetchText } from "../src/lib/http.js";

// One-off diagnostic: candidate replacement sources for content that's
// blocked at the original site (ra.co, amsterdamsights.com) — checking
// whether an unrelated site that covers similar events is actually
// scrapable, before writing a scraper against it.
const TARGETS: Record<string, string> = {
  iamsterdam: "https://www.iamsterdam.com/en/whats-on",
  "iamsterdam-events": "https://www.iamsterdam.com/en/see-and-do/whats-on/events",
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
