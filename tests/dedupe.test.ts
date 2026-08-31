import { describe, expect, it } from "vitest";
import { dedupe, makeId, toEvents } from "../src/lib/dedupe.js";
import type { ScrapeResult } from "../src/types.js";

describe("makeId", () => {
  it("is stable for the same source and sourceId", () => {
    const a = makeId("jazzin", { title: "X", url: "https://a", sourceId: "42" });
    const b = makeId("jazzin", { title: "Y", url: "https://b", sourceId: "42" });
    expect(a).toBe(b);
  });

  it("differs across sources for the same sourceId", () => {
    const a = makeId("jazzin", { title: "X", url: "https://a", sourceId: "42" });
    const b = makeId("knit", { title: "X", url: "https://a", sourceId: "42" });
    expect(a).not.toBe(b);
  });
});

describe("dedupe", () => {
  it("merges events with the same normalized title and day across sources", () => {
    const result1: ScrapeResult = {
      source: "ra-amsterdam",
      sourceName: "RA",
      events: [
        { title: "Techno Night!", url: "https://ra.co/e/1", startDate: "2026-09-05T22:00:00" },
      ],
    };
    const result2: ScrapeResult = {
      source: "ra-promoter",
      sourceName: "Promoter",
      events: [
        { title: "techno night", url: "https://promoter.example/1", startDate: "2026-09-05T23:00:00" },
      ],
    };

    const scrapedAt = new Date().toISOString();
    const events = [...toEvents(result1, scrapedAt), ...toEvents(result2, scrapedAt)];
    const deduped = dedupe(events);

    expect(deduped).toHaveLength(1);
    expect(deduped[0].categories).toContain("clubbing-electronic");
  });

  it("keeps distinct events on different days", () => {
    const result: ScrapeResult = {
      source: "jazzin",
      sourceName: "Jazzin",
      events: [
        { title: "Weekly Jam", url: "https://a", startDate: "2026-09-05T20:00:00" },
        { title: "Weekly Jam", url: "https://a", startDate: "2026-09-12T20:00:00" },
      ],
    };
    const deduped = dedupe(toEvents(result, new Date().toISOString()));
    expect(deduped).toHaveLength(2);
  });
});
