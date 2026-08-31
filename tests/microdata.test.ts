import { describe, expect, it } from "vitest";
import { extractMicrodataEvents } from "../src/lib/microdata.js";

const PAGE_URL = "https://example.com/gigs";

describe("extractMicrodataEvents", () => {
  it("parses a schema.org Event microdata row (jazzin.amsterdam's real shape)", () => {
    const html = `
      <table><tbody>
        <tr itemscope itemtype="https://schema.org/Event">
          <td><time itemprop="startDate" datetime="2026-08-31T20:00:00.000+02:00">20:00</time></td>
          <td><a itemprop="url" href="https://venue.example/gig"><span itemprop="name">Cool Gig</span></a></td>
          <td itemprop="location" itemscope itemtype="https://schema.org/Place">
            <a href="https://maps.example"><span itemprop="name">Splendor</span></a>
          </td>
          <td>18</td>
        </tr>
      </tbody></table>
    `;
    const events = extractMicrodataEvents(html, PAGE_URL);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      title: "Cool Gig",
      url: "https://venue.example/gig",
      startDate: "2026-08-31T20:00:00.000+02:00",
      venue: "Splendor",
    });
  });

  it("ignores non-Event itemtypes and rows without a name", () => {
    const html = `
      <div itemscope itemtype="https://schema.org/Organization">
        <span itemprop="name">Not an event</span>
      </div>
      <div itemscope itemtype="https://schema.org/Event"></div>
    `;
    expect(extractMicrodataEvents(html, PAGE_URL)).toHaveLength(0);
  });

  it("falls back to the page URL when itemprop=url is missing", () => {
    const html = `
      <div itemscope itemtype="https://schema.org/Event">
        <span itemprop="name">Mystery Gig</span>
      </div>
    `;
    const events = extractMicrodataEvents(html, PAGE_URL);
    expect(events[0].url).toBe(PAGE_URL);
  });
});
