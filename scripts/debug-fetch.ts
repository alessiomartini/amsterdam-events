import { mkdir, writeFile } from "node:fs/promises";
import { fetchText } from "../src/lib/http.js";

// One-off: see what amsterdamsights.com's free-events page actually
// contains via the Wayback Machine's public archive (not scraping the
// live, Cloudflare-protected site — just reading a page Internet Archive
// already crawled and published), to compare against iamsterdam.com.
const TARGETS: Record<string, string> = {
  "wayback-availability":
    "https://archive.org/wayback/available?url=amsterdamsights.com/events/free-events.html",
};

async function main() {
  const outDir = new URL("../debug-html/", import.meta.url).pathname;
  await mkdir(outDir, { recursive: true });

  for (const [name, url] of Object.entries(TARGETS)) {
    try {
      const html = await fetchText(url, { retries: 0 });
      await writeFile(`${outDir}${name}.html`, html, "utf8");
      console.log(`[${name}] OK, ${html.length} bytes — ${url}`);
      console.log(html);
    } catch (err) {
      console.log(`[${name}] FAILED: ${(err as Error).message} — ${url}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
