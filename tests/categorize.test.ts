import { describe, expect, it } from "vitest";
import { categorize } from "../src/lib/categorize.js";
import type { RawEvent } from "../src/types.js";

function event(overrides: Partial<RawEvent>): RawEvent {
  return { title: "Untitled", url: "https://example.com", ...overrides };
}

describe("categorize", () => {
  it("applies source defaults", () => {
    expect(categorize("jazzin", event({ title: "Anything" }))).toContain("live-music");
    expect(categorize("playpartners", event({ title: "Anything" }))).toContain("sex-positive");
    expect(categorize("ra-amsterdam", event({ title: "Anything" }))).toContain("clubbing-electronic");
    expect(categorize("knit", event({ title: "Anything" }))).toContain("sex-positive");
    expect(categorize("bimhuis", event({ title: "Anything" }))).toContain("jazz");
    expect(categorize("concertgebouw", event({ title: "Anything" }))).toContain("classical");
    expect(categorize("operaballet", event({ title: "Anything" }))).toContain("opera-ballet");
  });

  it("splits jazz, classical, opera/ballet, and general live music into separate categories", () => {
    expect(categorize("eventbrite", event({ title: "Free Jazz Jam" }))).toContain("jazz");
    expect(categorize("eventbrite", event({ title: "Beethoven Symphony No. 5" }))).toContain("classical");
    expect(categorize("eventbrite", event({ title: "Swan Lake ballet" }))).toContain("opera-ballet");
    expect(categorize("eventbrite", event({ title: "Open mic night" }))).toContain("live-music");
  });

  it("does not tag a jazz gig as classical or vice versa", () => {
    const jazz = categorize("eventbrite", event({ title: "Jazz Jam Session" }));
    expect(jazz).not.toContain("classical");
    const classical = categorize("eventbrite", event({ title: "Chamber music recital" }));
    expect(classical).not.toContain("jazz");
  });

  it("matches keyword rules in title and description", () => {
    const cats = categorize(
      "radar-squat",
      event({ title: "Free museum night", description: "Gratis toegang tot het Stedelijk" }),
    );
    expect(cats).toContain("free-museum");
  });

  it("adds free-entry when isFree is set", () => {
    const cats = categorize("plukdeliefde", event({ title: "Park picnic", isFree: true }));
    expect(cats).toContain("free-entry");
  });

  it("does not tag a paid exhibition as free-museum", () => {
    const cats = categorize(
      "amsterdamsights-exhibitions",
      event({ title: "Judy Chicago: Revelations", description: "Solo exhibition at the Jewish Museum" }),
    );
    expect(cats).not.toContain("free-museum");
  });

  it("tags a free museum-related event as free-museum", () => {
    const cats = categorize(
      "amsterdamsights-manual",
      event({ title: "NEMO's Panorama Terrace", venue: "NEMO Science Museum", isFree: true }),
    );
    expect(cats).toContain("free-museum");
  });

  it("detects demonstrations", () => {
    const cats = categorize("radar-squat", event({ title: "Solidarity demonstration at Dam" }));
    expect(cats).toContain("demonstration");
  });

  it("falls back to other when nothing matches", () => {
    const cats = categorize("radar-squat", event({ title: "Untitled thing", description: "" }));
    expect(cats).toEqual(["other"]);
  });
});
