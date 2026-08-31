import { mkdir, writeFile } from "node:fs/promises";
import { fetchText } from "../src/lib/http.js";

const TARGETS: Record<string, string> = {
  "iamsterdam-calendar": "https://www.iamsterdam.com/en/whats-on/calendar",
  "iamsterdam-free": "https://www.iamsterdam.com/en/whats-on/calendar?free=true",
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
