// Server-only. Drives a real, dedicated Chromium instance via Playwright so
// ULTRON can open websites, read them, and click/type on its own.
//
// This is a FRESH automated browser profile — not your everyday Chrome, not
// logged into your accounts, no shared history or cookies — unless you sign
// in inside the window it opens. That's deliberate: it keeps an autonomous
// agent from silently reusing your real sessions.
//
// The instance is a module-level singleton kept alive on `globalThis` so it
// survives Next.js dev-server hot reloads. It only makes sense on a
// long-lived Node process (`next dev` / `next start`), not a serverless/edge
// deployment.

import type { Browser, Page } from "playwright";

const HEADLESS = process.env.ULTRON_BROWSER_HEADLESS === "true";

export interface PageElement {
  id: number;
  tag: string;
  role: string;
  text: string;
  href?: string;
  inputType?: string;
}

export interface PageState {
  url: string;
  title: string;
  text: string;
  elements: PageElement[];
}

interface Session {
  browser: Browser;
  page: Page;
  nextElementId: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __ultronBrowserSession: Promise<Session> | undefined;
}

async function launchSession(): Promise<Session> {
  const { chromium } = await import("playwright");
  let browser: Browser;
  try {
    browser = await chromium.launch({ headless: HEADLESS });
  } catch (err) {
    if (!HEADLESS) {
      // No display available (headless server) — fall back automatically.
      console.warn(
        "[ultron] Headed browser launch failed, falling back to headless:",
        (err as Error).message,
      );
      browser = await chromium.launch({ headless: true });
    } else {
      throw err;
    }
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  return { browser, page, nextElementId: 1 };
}

async function getSession(): Promise<Session> {
  if (!globalThis.__ultronBrowserSession) {
    globalThis.__ultronBrowserSession = launchSession();
  }
  try {
    const session = await globalThis.__ultronBrowserSession;
    // Detect a closed/crashed browser and relaunch.
    if (!session.browser.isConnected()) {
      globalThis.__ultronBrowserSession = launchSession();
      return await globalThis.__ultronBrowserSession;
    }
    return session;
  } catch (err) {
    globalThis.__ultronBrowserSession = undefined;
    throw err;
  }
}

function assertHttpUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`"${url}" is not a valid URL.`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Refusing to navigate to non-http(s) URL: ${url}`);
  }
}

// Injected into the page: tags every visible, interactive element with a
// data-ultron-id and returns a compact description ULTRON can act on.
async function tagInteractiveElements(page: Page, startId: number): Promise<PageElement[]> {
  return page.evaluate((startId) => {
    const SELECTOR =
      'a[href], button, input, textarea, select, [role="button"], [role="link"], [role="tab"], [onclick], summary';
    const out: {
      id: number;
      tag: string;
      role: string;
      text: string;
      href?: string;
      inputType?: string;
    }[] = [];
    let id = startId;
    const nodes = Array.from(document.querySelectorAll(SELECTOR));
    for (const el of nodes) {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const visible =
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none";
      if (!visible) continue;
      const text = (el.textContent || (el as HTMLInputElement).value || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 120);
      const ariaLabel = el.getAttribute("aria-label")?.trim();
      el.setAttribute("data-ultron-id", String(id));
      out.push({
        id,
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute("role") || el.tagName.toLowerCase(),
        text: ariaLabel || text || el.getAttribute("placeholder") || "",
        href: (el as HTMLAnchorElement).href || undefined,
        inputType: (el as HTMLInputElement).type || undefined,
      });
      id++;
      if (out.length >= 150) break; // keep the tool payload sane
    }
    return out;
  }, startId);
}

async function readPageState(session: Session): Promise<PageState> {
  const { page } = session;
  const elements = await tagInteractiveElements(page, 1);
  session.nextElementId = elements.length + 1;
  const [title, bodyText] = await Promise.all([
    page.title(),
    page
      .evaluate(() => document.body?.innerText?.slice(0, 4000) ?? "")
      .catch(() => ""),
  ]);
  return {
    url: page.url(),
    title,
    text: bodyText.trim(),
    elements,
  };
}

export async function getState(): Promise<PageState> {
  const session = await getSession();
  return readPageState(session);
}

export async function navigate(url: string): Promise<PageState> {
  assertHttpUrl(url);
  const session = await getSession();
  await session.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await session.page.waitForTimeout(400); // let above-the-fold JS settle
  return readPageState(session);
}

export async function clickElement(id: number): Promise<PageState> {
  const session = await getSession();
  const target = session.page.locator(`[data-ultron-id="${id}"]`);
  if ((await target.count()) === 0) {
    throw new Error(`No element with id ${id}. Call read_page again — ids change after navigation.`);
  }
  await target.first().click({ timeout: 10_000 });
  await session.page.waitForTimeout(400);
  return readPageState(session);
}

export async function typeIntoElement(
  id: number,
  text: string,
  submit = false,
): Promise<PageState> {
  const session = await getSession();
  const target = session.page.locator(`[data-ultron-id="${id}"]`);
  if ((await target.count()) === 0) {
    throw new Error(`No element with id ${id}. Call read_page again — ids change after navigation.`);
  }
  await target.first().fill(text, { timeout: 10_000 });
  if (submit) {
    await target.first().press("Enter");
  }
  await session.page.waitForTimeout(400);
  return readPageState(session);
}

export async function scrollPage(direction: "up" | "down"): Promise<PageState> {
  const session = await getSession();
  const dy = direction === "down" ? 700 : -700;
  await session.page.mouse.wheel(0, dy);
  await session.page.waitForTimeout(200);
  return readPageState(session);
}

export async function goBack(): Promise<PageState> {
  const session = await getSession();
  await session.page.goBack({ waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => {});
  await session.page.waitForTimeout(300);
  return readPageState(session);
}

export async function screenshotBase64(): Promise<string> {
  const session = await getSession();
  const buf = await session.page.screenshot({ type: "jpeg", quality: 60 });
  return buf.toString("base64");
}

export async function closeSession(): Promise<void> {
  if (globalThis.__ultronBrowserSession) {
    const session = await globalThis.__ultronBrowserSession.catch(() => undefined);
    await session?.browser.close().catch(() => {});
    globalThis.__ultronBrowserSession = undefined;
  }
}
