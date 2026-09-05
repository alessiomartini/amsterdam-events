import { mkdir, copyFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";

const SRC = new URL("../data/events.json", import.meta.url).pathname;
const DEST = new URL("../web/data/events.json", import.meta.url).pathname;

const LEAFLET_SRC = new URL("../node_modules/leaflet/dist", import.meta.url).pathname;
const LEAFLET_DEST = new URL("../web/vendor/leaflet", import.meta.url).pathname;

async function main() {
  await mkdir(dirname(DEST), { recursive: true });
  await copyFile(SRC, DEST);
  console.log(`Copied ${SRC} -> ${DEST}`);

  await vendorLeaflet();

  console.log("web/ is now a self-contained static site, ready to deploy.");
}

/**
 * Copies Leaflet's built JS/CSS/marker-icon assets from node_modules into
 * web/vendor/leaflet/ so the deployed site loads the map library from
 * itself rather than an external CDN — same "self-contained static site"
 * reasoning as copying data/events.json above, and it means the map view
 * can be tested locally with zero network access.
 */
async function vendorLeaflet(): Promise<void> {
  await mkdir(join(LEAFLET_DEST, "images"), { recursive: true });
  await copyFile(join(LEAFLET_SRC, "leaflet.js"), join(LEAFLET_DEST, "leaflet.js"));
  await copyFile(join(LEAFLET_SRC, "leaflet.css"), join(LEAFLET_DEST, "leaflet.css"));

  const images = await readdir(join(LEAFLET_SRC, "images"));
  for (const image of images) {
    await copyFile(join(LEAFLET_SRC, "images", image), join(LEAFLET_DEST, "images", image));
  }
  console.log(`Vendored Leaflet (JS, CSS, ${images.length} marker images) into web/vendor/leaflet/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
