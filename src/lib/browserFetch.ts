import { chromium } from "playwright";

/**
 * Renders a URL in a real (headless) Chromium and returns the final HTML.
 * For sites protected by a JS-based bot check (Cloudflare, PerimeterX,
 * etc.) a plain HTTP fetch gets rejected outright — a real browser context
 * at least executes the challenge JS and carries a genuine fingerprint,
 * which passes the simpler "are you a browser at all" checks (though not
 * necessarily an interactive CAPTCHA/Turnstile challenge).
 */
export async function fetchRenderedHtml(
  url: string,
  options: { waitForSelector?: string; timeoutMs?: number } = {},
): Promise<string> {
  const { waitForSelector, timeoutMs = 30_000 } = options;

  const browser = await chromium.launch({
    args: ["--disable-blink-features=AutomationControlled"],
  });
  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      locale: "en-US",
      viewport: { width: 1280, height: 900 },
    });
    // A bare `navigator.webdriver === true` is the single most common
    // headless-browser tell; Playwright doesn't hide it by default.
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: timeoutMs });
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: timeoutMs }).catch(() => {});
    }
    return await page.content();
  } finally {
    await browser.close();
  }
}
