import ICAL from "ical.js";
import { fetchText } from "../lib/http.js";
import type { RawEvent, ScrapeResult } from "../types.js";

const ICS_URL =
  "https://calendar.google.com/calendar/ical/esk71dgb63h0pdum12cnovpisk%40group.calendar.google.com/public/basic.ics";
const INFO_URL = "https://iop.uva.nl/content/research-groups/strings/seminars/information.html";

/**
 * The UvA string theory group announces its weekly seminars by email
 * (stringseminar@list.uva.nl), but its own seminars-info page names the
 * calendar it actually schedules from: a public Google Calendar
 * ("Amsterdam Seminars", id esk71dgb63h0pdum12cnovpisk@group.calendar.google.com)
 * embedded for anyone to check "time, location and speaker". Any calendar
 * embeddable that way publishes a standard public .ics feed — verified
 * live via CI, no auth needed. Parsed with ical.js (already a project
 * dependency) rather than hand-rolling iCalendar parsing.
 *
 * The calendar goes back to 2019 and mixes in non-seminar bookings
 * (one-off meetings, "Conversation with ..."), so this keeps only
 * upcoming entries and drops anything that looks like a personal
 * booking rather than a talk. It has no location data on any entry
 * checked, so venue/address fall back to the group's own building.
 */
export async function scrape(): Promise<ScrapeResult> {
  const ics = await fetchText(ICS_URL);
  const events = parseIcs(ics);

  if (events.length === 0) {
    console.warn(`[string-seminar] No upcoming events found in ${ICS_URL}. Feed may have changed.`);
  }

  return { source: "string-seminar", sourceName: "UvA String Theory Seminars", events };
}

const NON_SEMINAR = /\b(meeting|conversation|iPraktijk)\b/i;

export function parseIcs(ics: string): RawEvent[] {
  const root = new ICAL.Component(ICAL.parse(ics));
  const vevents = root.getAllSubcomponents("vevent");

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 1);

  const events: RawEvent[] = [];
  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent);
    const summary = event.summary?.trim();
    if (!summary || NON_SEMINAR.test(summary)) continue;

    const startDate = event.startDate?.toJSDate();
    if (!startDate || startDate < cutoff) continue;
    const endDate = event.endDate?.toJSDate();

    events.push({
      sourceId: event.uid,
      title: `String Theory Seminar: ${summary}`,
      description: event.description || undefined,
      url: INFO_URL,
      venue: "Institute of Physics, University of Amsterdam",
      address: "Science Park 904, Amsterdam",
      startDate: startDate.toISOString(),
      endDate: endDate?.toISOString(),
      isFree: true,
    });
  }
  return events;
}
