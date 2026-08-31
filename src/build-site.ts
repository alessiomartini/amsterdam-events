import { mkdir, copyFile } from "node:fs/promises";
import { dirname } from "node:path";

const SRC = new URL("../data/events.json", import.meta.url).pathname;
const DEST = new URL("../web/data/events.json", import.meta.url).pathname;

async function main() {
  await mkdir(dirname(DEST), { recursive: true });
  await copyFile(SRC, DEST);
  console.log(`Copied ${SRC} -> ${DEST}`);
  console.log("web/ is now a self-contained static site, ready to deploy.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
