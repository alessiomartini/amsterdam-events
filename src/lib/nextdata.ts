import * as cheerio from "cheerio";

/**
 * Next.js apps (ra.co is one) embed their initial server-rendered page
 * state as JSON in <script id="__NEXT_DATA__">. Reading it directly is far
 * more robust than scraping the rendered DOM (which for a client-rendered
 * React app may not even contain the event list in static HTML). Returns
 * the parsed `props.pageProps` object, or undefined if the page isn't
 * Next.js / doesn't have it.
 */
export function extractNextData(html: string): Record<string, unknown> | undefined {
  const $ = cheerio.load(html);
  const raw = $("#__NEXT_DATA__").contents().text();
  if (!raw?.trim()) return undefined;
  try {
    const parsed = JSON.parse(raw) as { props?: { pageProps?: unknown } };
    const pageProps = parsed.props?.pageProps;
    return pageProps && typeof pageProps === "object"
      ? (pageProps as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

/** Deep-search an arbitrary object graph for arrays of "event-shaped" objects. */
export function findEventArrays(
  root: unknown,
  isEventShaped: (obj: Record<string, unknown>) => boolean,
  maxDepth = 8,
): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  const seen = new Set<unknown>();

  function walk(node: unknown, depth: number) {
    if (!node || typeof node !== "object" || depth > maxDepth || seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      const objItems = node.filter(
        (item): item is Record<string, unknown> =>
          !!item && typeof item === "object" && !Array.isArray(item),
      );
      if (objItems.length && objItems.every(isEventShaped)) {
        found.push(...objItems);
      } else {
        for (const item of node) walk(item, depth + 1);
      }
      return;
    }

    for (const value of Object.values(node as Record<string, unknown>)) {
      walk(value, depth + 1);
    }
  }

  walk(root, 0);
  return found;
}
