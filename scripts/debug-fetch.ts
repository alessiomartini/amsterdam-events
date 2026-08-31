import { mkdir, writeFile } from "node:fs/promises";
import { fetchText } from "../src/lib/http.js";
import { fetchRenderedHtml } from "../src/lib/browserFetch.js";

// One-off diagnostic: try several strategies for the sources that are
// currently blocked, and dump whatever HTML each strategy gets back, so we
// can inspect it and pick a real fix (this repo's dev sandbox has no
// outbound network access to these sites — this only works from CI/local).

const OLD_BOT_UA = "Mozilla/5.0 (compatible; amsterdam-events-bot/0.1; +https://github.com/)";
const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

async function main() {
  const outDir = new URL("../debug-html/", import.meta.url).pathname;
  await mkdir(outDir, { recursive: true });

  await tryFetch("plukdeliefde-old-ua", () =>
    fetchText("https://www.plukdeliefde.nl/agenda/", { headers: { "User-Agent": OLD_BOT_UA } }),
  );
  await tryFetch("plukdeliefde-chrome-ua", () =>
    fetchText("https://www.plukdeliefde.nl/agenda/", { headers: { "User-Agent": CHROME_UA } }),
  );
  await tryFetch("plukdeliefde-no-accept-lang", () =>
    fetchText("https://www.plukdeliefde.nl/agenda/", {
      headers: { "User-Agent": CHROME_UA, "Accept-Language": "" },
    }),
  );

  await tryFetch("eventbrite-plain-fetch", () =>
    fetchText("https://www.eventbrite.com/d/netherlands--amsterdam/free--film-and-media--events/"),
  );
  await tryFetch("eventbrite-browser", () =>
    fetchRenderedHtml("https://www.eventbrite.com/d/netherlands--amsterdam/free--film-and-media--events/"),
  );

  await tryFetch("ra-amsterdam-plain-fetch", () => fetchText("https://ra.co/events/nl/amsterdam"));
  await tryFetch("ra-amsterdam-browser", () =>
    fetchRenderedHtml("https://ra.co/events/nl/amsterdam", { waitForSelector: "a" }),
  );

  async function tryFetch(name: string, fn: () => Promise<string>) {
    try {
      const html = await fn();
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
