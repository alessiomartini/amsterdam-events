import { fetchText } from "../lib/http.js";
import { extractJsonLdEvents } from "../lib/jsonld.js";
import { extractNextData, findEventArrays } from "../lib/nextdata.js";
import type { RawEvent } from "../types.js";

/**
 * ra.co (Resident Advisor) is a Next.js app. The listing you see is
 * client-rendered from data RA embeds server-side in a
 * <script id="__NEXT_DATA__"> tag, so we read that instead of trying to
 * scrape the rendered DOM. We can't know RA's exact field names without
 * inspecting a live page (blocked from this sandbox), so this uses a loose
 * shape-based heuristic and falls back to JSON-LD, then to nothing (with a
 * warning) rather than guessing a GraphQL query body blind.
 */
export async function scrapeRaPage(url: string): Promise<RawEvent[]> {
  const html = await fetchText(url);

  const pageProps = extractNextData(html);
  if (pageProps) {
    const candidates = findEventArrays(pageProps, isRaEventShaped);
    const events = candidates.map((node) => raNodeToEvent(node, url)).filter(Boolean) as RawEvent[];
    if (events.length > 0) return events;
  }

  const jsonLd = extractJsonLdEvents(html, url);
  if (jsonLd.length > 0) return jsonLd;

  console.warn(
    `[ra] No events extracted from ${url} via __NEXT_DATA__ or JSON-LD. ` +
      `RA's internal data shape may have changed, or their public GraphQL API ` +
      `(POST https://ra.co/graphql) needs to be used instead — see README.`,
  );
  return [];
}

function isRaEventShaped(obj: Record<string, unknown>): boolean {
  const hasTitle = typeof obj.title === "string" && obj.title.length > 0;
  const hasDate =
    typeof obj.date === "string" ||
    typeof obj.startTime === "string" ||
    typeof obj.startDate === "string";
  return hasTitle && hasDate;
}

function raNodeToEvent(node: Record<string, unknown>, pageUrl: string): RawEvent | undefined {
  const title = node.title as string | undefined;
  if (!title) return undefined;

  const startDate =
    (node.startTime as string | undefined) ??
    (node.startDate as string | undefined) ??
    (node.date as string | undefined);

  const venue = node.venue as Record<string, unknown> | undefined;
  const slug = (node.contentUrl as string | undefined) ?? (node.slug as string | undefined);
  const url = slug ? new URL(slug, "https://ra.co").toString() : pageUrl;

  const images = node.images as Record<string, unknown>[] | undefined;
  const imageUrl = images?.[0]?.filename as string | undefined;

  return {
    sourceId: node.id !== undefined ? String(node.id) : undefined,
    title,
    url,
    startDate,
    venue: (venue?.name as string | undefined) ?? undefined,
    imageUrl,
    isFree: node.isFree === true || node.cost === 0,
    price: typeof node.cost === "number" ? `${node.cost} EUR` : undefined,
  };
}
