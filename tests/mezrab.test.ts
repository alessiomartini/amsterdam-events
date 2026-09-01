import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as cheerio from "cheerio";

// Re-implements the same extraction logic as src/scrapers/mezrab.ts against
// a synthetic fragment mirroring the real markup (verified via CI against
// the live page — a WordPress "Events Manager" widget), since the scraper
// module doesn't export its internals.
function parse(html: string) {
  const $ = cheerio.load(html);
  const events: { title: string; url: string; venue?: string; startDate?: string; dateText?: string }[] = [];

  $("table.tableeventd").each((_, table) => {
    const row = $(table);
    const dateText = row.find("td.eventtd24").first().text().trim();
    const titleCell = row.find("td.eventtda24").first();
    const titleLink = titleCell.find("a").first();
    const title = titleLink.text().trim();
    const href = titleLink.attr("href");
    if (!title || !href || !dateText) return;

    const locationSpan = titleCell.find(".locationhomepage").first();
    const venue = locationSpan.length
      ? locationSpan.text().replace(/^Location:/i, "").trim() || undefined
      : "Mezrab";

    events.push({ title, url: href, venue, startDate: parseMezrabDate(dateText), dateText });
  });

  return events;
}

function parseMezrabDate(text: string): string | undefined {
  const match = /(\d{1,2})\.(\d{1,2})\s*\|\s*(\d{1,2}):(\d{2})/.exec(text);
  if (!match) return undefined;
  const [, dayStr, monthStr, hourStr, minuteStr] = match;
  const day = Number(dayStr);
  const month = Number(monthStr) - 1;
  const now = new Date();
  let year = now.getFullYear();
  const candidate = new Date(year, month, day);
  if (candidate.getTime() < now.getTime() - 30 * 86400000) year += 1;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month + 1)}-${pad(day)}T${hourStr.padStart(2, "0")}:${minuteStr}:00`;
}

describe("mezrab events widget parsing", () => {
  const html = `
    <table class="tableeventd">
      <tbody>
        <td class="eventtd24"> Tue 1.09 | 20:00 </td>
        <td class="eventtda24"><a href="https://mezrab.nl/events/mythos/">Mythos. Ancient tales.</a></td>
      </tbody>
    </table>
    <table class="tableeventd">
      <tbody>
        <td class="eventtd24"> Thu 3.09 | 19:00 </td>
        <td class="eventtda24"><a href="https://mezrab.nl/events/fringe/">Amsterdam Fringe Festival</a>
          <a href="https://mezrab.nl/theothermezrab/">   <span class="locationhomepage">Location:<br>The Other Mezrab   </span> </a>
        </td>
      </tbody>
    </table>
  `;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T00:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("extracts title, url, and venue, defaulting to Mezrab", () => {
    const events = parse(html);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      title: "Mythos. Ancient tales.",
      url: "https://mezrab.nl/events/mythos/",
      venue: "Mezrab",
      startDate: "2026-09-01T20:00:00",
    });
  });

  it("picks up the alternate venue when a location span is present", () => {
    const events = parse(html);
    expect(events[1]).toMatchObject({
      title: "Amsterdam Fringe Festival",
      venue: "The Other Mezrab",
      startDate: "2026-09-03T19:00:00",
    });
  });

  it("rolls the year forward when the date would otherwise be in the past", () => {
    // "today" is fixed at 2026-08-31; a January date is next year, not this one.
    const html2 = `
      <table class="tableeventd">
        <tbody>
          <td class="eventtd24"> Fri 15.01 | 20:00 </td>
          <td class="eventtda24"><a href="https://mezrab.nl/events/new-year-show/">New Year Show</a></td>
        </tbody>
      </table>
    `;
    const events = parse(html2);
    expect(events[0].startDate).toBe("2027-01-15T20:00:00");
  });
});
