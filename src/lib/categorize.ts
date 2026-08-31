import type { Category, RawEvent, SourceId } from "../types.js";

/** Default categories to apply for every event from a given source, before keyword rules run. */
const SOURCE_DEFAULTS: Partial<Record<SourceId, Category[]>> = {
  jazzin: ["jazz-live-music"],
  // radar.squat.net hosts a broad mix (yoga, communal meals, film nights,
  // gigs, workshops, and occasional actual demonstrations) — real scrape
  // data showed tagging everything "demonstration" was wrong. Let the
  // keyword rules below decide instead of defaulting the whole source.
  playpartners: ["sex-positive"],
  // KNIT's own JSON-LD Organization data describes itself as "a
  // community-led, sex positive event series ... House to techno" —
  // verified against real markup.
  knit: ["sex-positive", "clubbing-electronic"],
  "ra-amsterdam": ["clubbing-electronic"],
  "ra-promoter": ["clubbing-electronic"],
};

interface Rule {
  category: Category;
  keywords: RegExp;
}

const RULES: Rule[] = [
  {
    category: "jazz-live-music",
    keywords: /\b(jazz|live music|live band|open mic|jam session|singer[- ]songwriter|acoustic set|blues night)\b/i,
  },
  {
    category: "clubbing-electronic",
    keywords: /\b(techno|house|dj set|club night|rave|electronic music|drum ?&? ?bass|dnb)\b/i,
  },
  {
    category: "free-museum",
    keywords: /\b(museum|gallery|expositie|exhibition|free entry|gratis toegang|museumnacht)\b/i,
  },
  {
    category: "demonstration",
    keywords: /\b(demonstratie|demonstration|protest|manifestatie|actie|solidarity|staking|strike|march)\b/i,
  },
  {
    category: "park-square",
    keywords: /\b(park|plein|square|outdoor|buiten|festival|kiosk|vondelpark|westerpark|oosterpark)\b/i,
  },
  {
    category: "sex-positive",
    keywords: /\b(sex[- ]?positive|kink|fetish|bdsm|play ?party|consent|polyamor|queer play|munch)\b/i,
  },
  {
    category: "film-media",
    keywords: /\b(film|cinema|screening|documentary|movie night)\b/i,
  },
  {
    category: "free-entry",
    keywords: /\b(free entry|free admission|gratis entree|no cover|entree vrij)\b/i,
  },
];

/** Assigns categories to an event based on its source and keyword matches in its text fields. */
export function categorize(source: SourceId, event: RawEvent): Category[] {
  const categories = new Set<Category>(SOURCE_DEFAULTS[source] ?? []);

  const haystack = [event.title, event.description, event.venue, ...(event.tags ?? [])]
    .filter(Boolean)
    .join(" \n ");

  for (const rule of RULES) {
    if (rule.keywords.test(haystack)) categories.add(rule.category);
  }

  if (event.isFree) categories.add("free-entry");

  if (categories.size === 0) categories.add("other");
  return [...categories];
}
