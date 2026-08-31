// A generic "bot" UA gets flat-out rejected (403/405) by ra.co and
// Eventbrite's bot protection — verified against real responses from CI.
// A realistic desktop-browser UA + Accept-Language at least gets past the
// simplest WAF rules, though sites behind a JS challenge (e.g. Cloudflare)
// will still block a plain HTTP fetch regardless of headers.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

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
        throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
      }
      return await res.text();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await sleep(500 * 2 ** attempt);
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
