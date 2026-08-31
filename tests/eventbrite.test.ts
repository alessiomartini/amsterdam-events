import { describe, expect, it } from "vitest";
import { toRawEvent } from "../src/scrapers/eventbrite.js";

describe("eventbrite toRawEvent", () => {
  it("maps a typical API event", () => {
    const raw = toRawEvent({
      id: "123",
      name: { text: "Free Jazz Jam" },
      description: { text: "A jam session." },
      url: "https://www.eventbrite.com/e/123",
      start: { local: "2026-09-05T20:00:00", utc: "2026-09-05T18:00:00Z" },
      end: { local: "2026-09-05T23:00:00" },
      is_free: true,
      logo: { url: "https://img.example/logo.png" },
      venue: {
        name: "Bimhuis",
        address: { localized_address_display: "Piet Heinkade 3, Amsterdam" },
      },
    });

    expect(raw).toMatchObject({
      sourceId: "123",
      title: "Free Jazz Jam",
      description: "A jam session.",
      url: "https://www.eventbrite.com/e/123",
      venue: "Bimhuis",
      address: "Piet Heinkade 3, Amsterdam",
      startDate: "2026-09-05T20:00:00",
      isFree: true,
      price: "Free",
    });
  });

  it("falls back sensibly when optional fields are missing", () => {
    const raw = toRawEvent({
      id: "456",
      url: "https://www.eventbrite.com/e/456",
      start: { utc: "2026-09-06T18:00:00Z" },
    });

    expect(raw.title).toBe("Untitled event");
    expect(raw.startDate).toBe("2026-09-06T18:00:00Z");
    expect(raw.venue).toBeUndefined();
    expect(raw.price).toBeUndefined();
  });
});
