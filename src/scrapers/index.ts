import type { ScrapeResult, SourceId } from "../types.js";
import { scrape as scrapeJazzin } from "./jazzin.js";
import { scrape as scrapeRadar } from "./radar-squat.js";
import { scrape as scrapePluk } from "./plukdeliefde.js";
import { scrape as scrapeKnit } from "./knit.js";
import { scrape as scrapePlayPartners } from "./playpartners.js";
import { scrape as scrapeEventbrite } from "./eventbrite.js";
import { scrape as scrapeRaAmsterdam } from "./ra-amsterdam.js";
import { scrape as scrapeRaPromoter } from "./ra-promoter.js";
import { scrape as scrapeIAmsterdam } from "./iamsterdam.js";
import { scrape as scrapeAmsterdamSightsManual } from "./amsterdamsights-manual.js";
import { scrape as scrapeAmsterdamSightsExhibitions } from "./amsterdamsights-exhibitions.js";
import { scrape as scrapeAmsterdamSightsEvents } from "./amsterdamsights-events.js";
import { scrape as scrapePlantageDok } from "./plantagedok.js";
import { scrape as scrapeMezrab } from "./mezrab.js";

export const SCRAPERS: Record<SourceId, () => Promise<ScrapeResult>> = {
  jazzin: scrapeJazzin,
  "radar-squat": scrapeRadar,
  plukdeliefde: scrapePluk,
  knit: scrapeKnit,
  playpartners: scrapePlayPartners,
  eventbrite: scrapeEventbrite,
  "ra-amsterdam": scrapeRaAmsterdam,
  "ra-promoter": scrapeRaPromoter,
  iamsterdam: scrapeIAmsterdam,
  "amsterdamsights-manual": scrapeAmsterdamSightsManual,
  "amsterdamsights-exhibitions": scrapeAmsterdamSightsExhibitions,
  "amsterdamsights-events": scrapeAmsterdamSightsEvents,
  plantagedok: scrapePlantageDok,
  mezrab: scrapeMezrab,
};

/** Runs every scraper, isolating failures so one broken source doesn't kill the run. */
export async function runAllScrapers(): Promise<ScrapeResult[]> {
  const entries = Object.entries(SCRAPERS) as [SourceId, () => Promise<ScrapeResult>][];
  return Promise.all(
    entries.map(async ([source, run]) => {
      try {
        return await run();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[${source}] scrape failed: ${message}`);
        return { source, sourceName: source, events: [], error: message } satisfies ScrapeResult;
      }
    }),
  );
}
