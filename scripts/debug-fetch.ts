import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { fetchText } from "../src/lib/http.js";

// One-off diagnostic: fetch raw HTML for a set of source URLs and dump it
// (this repo's dev sandbox has no outbound network access to these sites —
// this only works from CI/local). Edit TARGETS below when a scraper starts
// returning zero events and needs its markup re-inspected.
const TARGETS: Record<string, string> = {
  amsterdamsights: "https://www.amsterdamsights.com/events/free-events.html",
};

async function testBrowser(name: string, url: string, outDir: string) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    // Give a Cloudflare "Just a moment..." JS challenge time to resolve on
    // its own (no human interaction) before capturing the final HTML.
    await page.waitForTimeout(6000);
    const html = await page.content();
    await writeFile(`${outDir}${name}-browser.html`, html, "utf8");
    console.log(`[${name}-browser] OK, ${html.length} bytes, title="${await page.title()}"`);
  } finally {
    await browser.close();
  }
}

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

    try {
      await testBrowser(name, url, outDir);
    } catch (err) {
      console.log(`[${name}-browser] FAILED: ${(err as Error).message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
