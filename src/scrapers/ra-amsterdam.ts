import type { ScrapeResult } from "../types.js";
import { scrapeRaPage } from "./ra-common.js";

const URL = "https://ra.co/events/nl/amsterdam";

export async function scrape(): Promise<ScrapeResult> {
  const events = await scrapeRaPage(URL);
  return { source: "ra-amsterdam", sourceName: "Resident Advisor — Amsterdam", events };
}
