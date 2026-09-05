export const CATEGORIES = [
  "jazz",
  "classical",
  "opera-ballet",
  "live-music",
  "clubbing-electronic",
  "free-museum",
  "demonstration",
  "park-square",
  "sex-positive",
  "film-media",
  "free-entry",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface RawEvent {
  /** Stable-ish id from the source, before we hash it. Falls back to url. */
  sourceId?: string;
  title: string;
  description?: string;
  url: string;
  imageUrl?: string;
  venue?: string;
  address?: string;
  /** ISO 8601 datetime, source's local time (Europe/Amsterdam) when known. */
  startDate?: string;
  endDate?: string;
  /** Free text if only a date-less description is available ("every Friday"). */
  dateText?: string;
  price?: string;
  isFree?: boolean;
  tags?: string[];
}

export interface Event extends RawEvent {
  id: string;
  source: SourceId;
  sourceName: string;
  categories: Category[];
  scrapedAt: string;
  /** Geocoded from venue/address (see src/lib/geocode.ts) — absent if geocoding hasn't found a match. */
  lat?: number;
  lon?: number;
}

export type SourceId =
  | "jazzin"
  | "radar-squat"
  | "plukdeliefde"
  | "knit"
  | "playpartners"
  | "eventbrite"
  | "ra-amsterdam"
  | "ra-promoter"
  | "iamsterdam"
  | "amsterdamsights-manual"
  | "amsterdamsights-exhibitions"
  | "amsterdamsights-events"
  | "plantagedok"
  | "mezrab"
  | "bimhuis"
  | "concertgebouw"
  | "skek"
  | "operaballet"
  | "spui25"
  | "string-seminar"
  | "diep-seminars";

export interface ScrapeResult {
  source: SourceId;
  sourceName: string;
  events: RawEvent[];
  error?: string;
}
