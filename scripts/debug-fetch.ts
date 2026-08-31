import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

// iamsterdam.com has no bot protection at all, but its /calendar page loads
// events via a client-side API call rather than static HTML. This just
// *observes* that network call in a real browser (nothing to bypass —
// the site is fully open) so we can hit the same API directly and cheaply
// going forward, instead of scraping the rendered page.
async function main() {
  const outDir = new URL("../debug-html/", import.meta.url).pathname;
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const calls: { url: string; method: string; postData: string | null }[] = [];

    page.on("request", (req) => {
      const url = req.url();
      if (!url.includes("iamsterdam.com") && !url.includes("prepr")) return;
      if (/\.(css|js|woff2?|png|jpe?g|svg|webp|ico)(\?|$)/i.test(url)) return;
      calls.push({ url, method: req.method(), postData: req.postData() });
    });

    await page.goto("https://www.iamsterdam.com/en/whats-on/calendar", {
      waitUntil: "networkidle",
      timeout: 30_000,
    });
    await page.waitForTimeout(3000);

    await writeFile(`${outDir}network-calls.json`, JSON.stringify(calls, null, 2), "utf8");
    console.log(`Captured ${calls.length} non-asset requests to iamsterdam.com/prepr.`);
    for (const call of calls) {
      console.log(`${call.method} ${call.url}${call.postData ? ` BODY:${call.postData.slice(0, 200)}` : ""}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
