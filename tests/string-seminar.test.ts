import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseIcs } from "../src/scrapers/string-seminar.js";

function ics(vevents: string): string {
  return `BEGIN:VCALENDAR\r\nPRODID:-//Test//EN\r\nVERSION:2.0\r\n${vevents}END:VCALENDAR\r\n`;
}

function vevent({
  uid,
  summary,
  start,
  end,
  description,
}: {
  uid: string;
  summary: string;
  start: string;
  end: string;
  description?: string;
}): string {
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : "",
    "END:VEVENT\r\n",
  ]
    .filter(Boolean)
    .join("\r\n");
}

describe("string-seminar ics parsing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-02T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("extracts an upcoming talk with a prefixed title", () => {
    const html = ics(
      vevent({
        uid: "abc-123",
        summary: "Miguel Correia",
        start: "20260908T093000Z",
        end: "20260908T103000Z",
      }),
    );
    const events = parseIcs(html);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      sourceId: "abc-123",
      title: "String Theory Seminar: Miguel Correia",
      startDate: "2026-09-08T09:30:00.000Z",
      endDate: "2026-09-08T10:30:00.000Z",
      isFree: true,
    });
  });

  it("drops events further in the past than the one-day cutoff", () => {
    const html = ics(
      vevent({
        uid: "old-1",
        summary: "Old Speaker",
        start: "20260801T093000Z",
        end: "20260801T103000Z",
      }),
    );
    expect(parseIcs(html)).toHaveLength(0);
  });

  it("keeps an event from just yesterday (within the one-day grace window)", () => {
    // "now" is fixed at 2026-09-02T12:00:00Z, so the cutoff is 2026-09-01T12:00:00Z —
    // an event later that same day is still within the grace window.
    const html = ics(
      vevent({
        uid: "yesterday-1",
        summary: "Yesterday Speaker",
        start: "20260901T180000Z",
        end: "20260901T190000Z",
      }),
    );
    expect(parseIcs(html)).toHaveLength(1);
  });

  it("filters out personal bookings like meetings and conversations", () => {
    const html = ics(
      vevent({
        uid: "meeting-1",
        summary: "Meeting Ben Freivogel",
        start: "20260910T120000Z",
        end: "20260910T130000Z",
      }) +
        vevent({
          uid: "convo-1",
          summary: "Conversation with iPraktijk Leah",
          start: "20260911T120000Z",
          end: "20260911T130000Z",
        }),
    );
    expect(parseIcs(html)).toHaveLength(0);
  });

  it("trims stray whitespace in the speaker name", () => {
    const html = ics(
      vevent({
        uid: "trim-1",
        summary: "Victor Rodriguez ",
        start: "20260910T103000Z",
        end: "20260910T113000Z",
      }),
    );
    expect(parseIcs(html)[0].title).toBe("String Theory Seminar: Victor Rodriguez");
  });
});
