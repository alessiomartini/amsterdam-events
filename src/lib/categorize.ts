import type { Category, RawEvent, SourceId } from "../types.js";

/** Default categories to apply for every event from a given source, before keyword rules run. */
const SOURCE_DEFAULTS: Partial<Record<SourceId, Category[]>> = {
  // Real scrape data shows jazzin.amsterdam is broader than pure jazz
  // (funk nights, a Lindy Hop class, a West End musical at Carré, jazz
  // documentaries) even though the site brands itself around jazz — so
  // it defaults to the general live-music bucket, same reasoning as
  // radar-squat below, and the "jazz" keyword rule picks up the (most)
  // gigs that actually say so.
  jazzin: ["live-music"],
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
  // Dedicated single-genre venues/companies — real scrape data confirms
  // each is overwhelmingly one thing (Bimhuis: jazz/improvised music,
  // Concertgebouw: classical/orchestral, Opera & Ballet: opera and dance).
  bimhuis: ["jazz"],
  concertgebouw: ["classical"],
  operaballet: ["opera-ballet"],
};

interface Rule {
  category: Category;
  keywords: RegExp;
}

const RULES: Rule[] = [
  {
    category: "jazz",
    keywords: /\bjazz\b/i,
  },
  {
    category: "classical",
    keywords: /\b(classical|orchestra|orchestral|philharmonic|symphony|symphonic|chamber music|concerto|sonata|requiem)\b/i,
  },
  {
    // Deliberately its own category rather than folded into "classical" —
    // ballet is dance, not a music genre, and this also catches an opera
    // or ballet mentioned on a source that isn't operaballet.nl itself.
    category: "opera-ballet",
    keywords: /\b(opera|ballet)\b/i,
  },
  {
    // Catch-all for live music that isn't specifically jazz/classical/
    // opera/ballet — blues, funk, singer-songwriter sets, open mics,
    // generic gigs.
    category: "live-music",
    keywords: /\b(live music|live band|open mic|jam session|singer[- ]songwriter|acoustic set|blues night|funk)\b/i,
  },
  {
    category: "clubbing-electronic",
    keywords: /\b(techno|house|dj set|club night|rave|electronic music|drum ?&? ?bass|dnb)\b/i,
  },
  {
    // Deliberately doesn't match bare "museum"/"gallery"/"exhibition" —
    // those alone don't mean free (see amsterdamsights-exhibitions, which
    // lists paid museum shows). Only an explicit free-entry signal, or a
    // museum/gallery keyword combined with event.isFree below, counts.
    category: "free-museum",
    keywords: /\b(free entry|free admission|free museum|gratis toegang|museumnacht)\b/i,
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

  if (event.isFree) {
    categories.add("free-entry");
    if (/\b(museum|gallery|expositie|exhibition)\b/i.test(haystack)) categories.add("free-museum");
  }

  if (categories.size === 0) categories.add("other");
  return [...categories];
}
