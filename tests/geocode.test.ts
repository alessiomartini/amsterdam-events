import { describe, expect, it } from "vitest";
import { geocodeQuery, locationKey } from "../src/lib/geocode.js";
import type { Event } from "../src/types.js";

function event(overrides: Partial<Event>): Event {
  return {
    id: "x",
    title: "Untitled",
    url: "https://example.com",
    source: "jazzin",
    sourceName: "Jazzin",
    categories: [],
    scrapedAt: "2026-09-05T00:00:00.000Z",
    ...overrides,
  };
}

describe("locationKey", () => {
  it("prefers venue over address", () => {
    expect(locationKey(event({ venue: "Bimhuis", address: "Piet Heinkade 3, Amsterdam" }))).toBe("Bimhuis");
  });

  it("falls back to address when there's no venue", () => {
    expect(locationKey(event({ address: "Buikslotermeerplein, Amsterdam" }))).toBe(
      "Buikslotermeerplein, Amsterdam",
    );
  });

  it("returns undefined when neither is present", () => {
    expect(locationKey(event({}))).toBeUndefined();
  });

  it("treats a blank venue as absent", () => {
    expect(locationKey(event({ venue: "  ", address: "Overtoom 301, Amsterdam" }))).toBe(
      "Overtoom 301, Amsterdam",
    );
  });

  it("strips a room suffix so every room in a building shares one cache entry", () => {
    expect(locationKey(event({ venue: "Concertgebouw – Main Hall" }))).toBe("Concertgebouw");
    expect(locationKey(event({ venue: "Dutch National Opera & Ballet – Main Stage" }))).toBe(
      "Dutch National Opera & Ballet",
    );
  });
});

describe("geocodeQuery", () => {
  it("combines venue and address when both are known", () => {
    expect(geocodeQuery(event({ venue: "OT301", address: "Overtoom 301, Amsterdam" }))).toBe(
      "OT301, Overtoom 301, Amsterdam",
    );
  });

  it("appends Amsterdam when it isn't already in the query", () => {
    expect(geocodeQuery(event({ venue: "Bimhuis" }))).toBe("Bimhuis, Amsterdam");
  });

  it("doesn't double up Amsterdam when the address already names it", () => {
    expect(geocodeQuery(event({ address: "Buikslotermeerplein, Amsterdam" }))).toBe(
      "Buikslotermeerplein, Amsterdam",
    );
  });

  it("queries with just the building name, not the room", () => {
    expect(geocodeQuery(event({ venue: "Concertgebouw – Main Hall" }))).toBe("Concertgebouw, Amsterdam");
  });
});
