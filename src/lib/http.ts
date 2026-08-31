// Counterintuitively, a generic self-identifying "bot" UA works better
// than a realistic desktop-Chrome UA for plukdeliefde.nl — verified
// against real responses from CI: the Chrome UA got a flat HTTP 403 while
// this one gets 200. Likely its WAF flags a common "fake browser" UA
// string that lacks the client-hints headers a real Chrome would send
// alongside it, whereas an honest bot UA doesn't trip that specific rule.
const USER_AGENT =
  "Mozilla/5.0 (compatible; amsterdam-events-bot/0.1; +https://github.com/)";

export interface FetchTextOptions {
  headers?: Record<string, string>;
  retries?: number;
  timeoutMs?: number;
  method?: string;
  body?: string;
}

/**
 * Fetch a URL as text with a browser-like UA, retries with backoff, and a
 * timeout. Scraper code should go through this instead of calling fetch
 * directly so behavior (rate limiting, retries) stays consistent.
 */
export async function fetchText(
  url: string,
  options: FetchTextOptions = {},
): Promise<string> {
  const { headers = {}, retries = 2, timeoutMs = 20_000, method, body } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        body,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/json,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,nl;q=0.8",
          ...headers,
        },
        signal: controller.signal,
      });
      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const snippet = bodyText.slice(0, 300);
        throw new Error(
          `HTTP ${res.status} ${res.statusText} for ${url}${snippet ? ` — ${snippet}` : ""}`,
        );
      }
      return await res.text();
    } catch (err) {
      lastError = err;
      const status = /^HTTP (\d{3})/.exec((err as Error).message)?.[1];
      const isClientError = status && Number(status) >= 400 && Number(status) < 500;
      if (attempt < retries && !isClientError) {
        await sleep(500 * 2 ** attempt);
      } else if (isClientError) {
        break;
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to fetch ${url}`);
}

export async function fetchJson<T = unknown>(
  url: string,
  options: FetchTextOptions = {},
): Promise<T> {
  const text = await fetchText(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return JSON.parse(text) as T;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
