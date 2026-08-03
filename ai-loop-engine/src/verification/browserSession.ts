import { chromium, type Browser, type BrowserContext } from "playwright";

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  close(): Promise<void>;
}

export async function openBrowserSession(
  viewport: { width: number; height: number } = { width: 1280, height: 800 },
): Promise<BrowserSession> {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport });
  return {
    browser,
    context,
    async close() {
      await context.close();
      await browser.close();
    },
  };
}
