import { describe, expect, it } from "vitest";
import { categorize } from "../src/lib/categorize.js";
import type { RawEvent } from "../src/types.js";

function event(overrides: Partial<RawEvent>): RawEvent {
  return { title: "Untitled", url: "https://example.com", ...overrides };
}

describe("categorize", () => {
  it("applies source defaults", () => {
    expect(categorize("jazzin", event({ title: "Anything" }))).toContain("jazz-live-music");
    expect(categorize("playpartners", event({ title: "Anything" }))).toContain("sex-positive");
    expect(categorize("ra-amsterdam", event({ title: "Anything" }))).toContain("clubbing-electronic");
  });

  it("matches keyword rules in title and description", () => {
    const cats = categorize(
      "knit",
      event({ title: "Free museum night", description: "Gratis toegang tot het Stedelijk" }),
    );
    expect(cats).toContain("free-museum");
  });

  it("adds free-entry when isFree is set", () => {
    const cats = categorize("plukdeliefde", event({ title: "Park picnic", isFree: true }));
    expect(cats).toContain("free-entry");
  });

  it("detects demonstrations", () => {
    const cats = categorize("radar-squat", event({ title: "Solidarity demonstration at Dam" }));
    expect(cats).toContain("demonstration");
  });

  it("falls back to other when nothing matches", () => {
    const cats = categorize("knit", event({ title: "Untitled thing", description: "" }));
    expect(cats).toEqual(["other"]);
  });
});
