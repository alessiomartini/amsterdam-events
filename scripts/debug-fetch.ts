import { mkdir, writeFile } from "node:fs/promises";
import { fetchText } from "../src/lib/http.js";

// One-off diagnostic: fetch raw HTML for a set of source URLs and dump it
// (this repo's dev sandbox has no outbound network access to these sites —
// this only works from CI/local). Edit TARGETS below when a scraper starts
// returning zero events and needs its markup re-inspected.
const TARGETS: Record<string, string> = {
  jazzin: "https://jazzin.amsterdam/",
  knit: "https://knit.amsterdam/events",
  playpartners: "https://www.playpartners.nl/events",
  plukdeliefde: "https://www.plukdeliefde.nl/agenda/",
  radar: "https://radar.squat.net/en/events/city/Amsterdam",
  iamsterdam: "https://www.iamsterdam.com/en/whats-on/calendar",
  mezrab: "https://mezrab.nl/",
  plantagedok: "https://plantagedok.nl/events/",
  offbeatSkek: "https://offbeat.amsterdam/place/100/'Skek",
  offbeatHome: "https://offbeat.amsterdam/",
  bimhuis: "https://www.bimhuis.nl/en/calendar",
  concertgebouw: "https://www.concertgebouw.nl/en/concerts-and-tickets",
  operaballet: "https://www.operaballet.nl/en/program",
  diepSeminars: "https://ias.uva.nl/news-and-events/series-at-ias/diep-seminar-series.html",
  stringSeminarInfo: "https://iop.uva.nl/content/research-groups/strings/seminars/information.html",
  spui25: "https://www.spui25.nl/agenda/language/en",
  iasEvents: "https://ias.uva.nl/news-and-events/events/events.html",
  stringGoogleCal: "https://iop.uva.nl/content/research-groups/strings/seminars/google-calendar/index.html",
  offbeatSpui25: "https://offbeat.amsterdam/place/47/SPUI25",
  iasEventsApi:
    "https://www.uva.nl/_restapi/list-json?uuid=e6cb65c6-83be-4a0b-babf-0cc79dfeee3e&mount=8a72ec52-758d-4a9c-9b30-d9d413d81759",
  stringSeminarIcs:
    "https://calendar.google.com/calendar/ical/esk71dgb63h0pdum12cnovpisk%40group.calendar.google.com/public/basic.ics",
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
