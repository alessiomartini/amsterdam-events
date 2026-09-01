import { describe, expect, it } from "vitest";
import { extractJsonLdEvents } from "../src/lib/jsonld.js";

const PAGE_URL = "https://example.com/events";

describe("extractJsonLdEvents", () => {
  it("parses a single Event block", () => {
    const html = `<html><head><script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": "Jazz Night",
        "startDate": "2026-09-05T20:00:00+02:00",
        "url": "https://example.com/jazz-night",
        "location": { "@type": "Place", "name": "Bimhuis", "address": { "streetAddress": "Piet Heinkade 3", "addressLocality": "Amsterdam" } },
        "offers": { "price": "12.50", "priceCurrency": "EUR" }
      }
    </script></head><body></body></html>`;

    const events = extractJsonLdEvents(html, PAGE_URL);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      title: "Jazz Night",
      url: "https://example.com/jazz-night",
      venue: "Bimhuis",
      address: "Piet Heinkade 3, Amsterdam",
      price: "12.50 EUR",
    });
  });

  it("unwraps @graph and ItemList wrappers, and free offers", () => {
    const html = `<script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": [
          { "@type": "ListItem", "item": {
              "@type": "Event",
              "name": "Free Museum Sunday",
              "url": "https://example.com/free-museum",
              "offers": { "price": 0, "priceCurrency": "EUR" }
          }}
        ]
      }
    </script>`;

    const events = extractJsonLdEvents(html, PAGE_URL);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Free Museum Sunday");
    expect(events[0].price).toBe("Free");
  });

  it("ignores non-Event JSON-LD and malformed JSON", () => {
    const html = `
      <script type="application/ld+json">{"@type":"Organization","name":"Not an event"}</script>
      <script type="application/ld+json">{ not valid json </script>
    `;
    expect(extractJsonLdEvents(html, PAGE_URL)).toHaveLength(0);
  });

  it("decodes and strips HTML from entity-escaped descriptions", () => {
    const html = `<script type="application/ld+json">
      {
        "@type": "Event",
        "name": "Dok Night",
        "description": "&lt;p&gt;Every Thursday there&#8217;s a Vegan Dinner &amp; a show.&lt;/p&gt;\\n"
      }
    </script>`;
    const events = extractJsonLdEvents(html, PAGE_URL);
    expect(events[0].description).toBe("Every Thursday there’s a Vegan Dinner & a show.");
  });

  it("decodes entities in the title too", () => {
    const html = `<script type="application/ld+json">
      {"@type": "Event", "name": "DansDok &#8211; lekker dansen"}
    </script>`;
    const events = extractJsonLdEvents(html, PAGE_URL);
    expect(events[0].title).toBe("DansDok – lekker dansen");
  });

  it("unescapes literal backslash-n left over from double-escaped source content", () => {
    const html = `<script type="application/ld+json">
      {"@type": "Event", "name": "Dok Night", "description": "Line one\\\\nLine two"}
    </script>`;
    const events = extractJsonLdEvents(html, PAGE_URL);
    expect(events[0].description).toBe("Line one Line two");
  });

  it("falls back to the page URL when no url field is present", () => {
    const html = `<script type="application/ld+json">
      {"@type": "Event", "name": "Mystery Gig"}
    </script>`;
    const events = extractJsonLdEvents(html, PAGE_URL);
    expect(events[0].url).toBe(PAGE_URL);
  });
});
