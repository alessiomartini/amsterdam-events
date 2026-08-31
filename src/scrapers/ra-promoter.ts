import type { ScrapeResult } from "../types.js";
import { scrapeRaPage } from "./ra-common.js";

const URL = "https://ra.co/promoters/117681/events";

export async function scrape(): Promise<ScrapeResult> {
  const events = await scrapeRaPage(URL);
  return { source: "ra-promoter", sourceName: "Resident Advisor — Promoter 117681", events };
}
