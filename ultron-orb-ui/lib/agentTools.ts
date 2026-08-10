// Tool definitions + dispatcher bridging the LLM's tool-calling loop to the
// Playwright-backed browser agent in lib/browserAgent.ts.

import type { ToolDef } from "./llmClient";
import * as browser from "./browserAgent";
import type { PageState } from "./browserAgent";

export const TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "read_page",
      description:
        "Read the current page: URL, title, visible text, and a numbered list of clickable/typeable elements. Call this first if you don't know what's on screen.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_navigate",
      description: "Open a URL (http/https only) in ULTRON's browser window.",
      parameters: {
        type: "object",
        properties: { url: { type: "string", description: "Full URL, e.g. https://example.com" } },
        required: ["url"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_click",
      description: "Click an element by the numeric id shown in read_page's element list.",
      parameters: {
        type: "object",
        properties: { id: { type: "integer", description: "Element id from read_page" } },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_type",
      description:
        "Type text into an input/textarea by id (from read_page). Set submit=true to press Enter afterwards (e.g. to submit a search).",
      parameters: {
        type: "object",
        properties: {
          id: { type: "integer" },
          text: { type: "string" },
          submit: { type: "boolean" },
        },
        required: ["id", "text"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_scroll",
      description: "Scroll the page up or down one screenful.",
      parameters: {
        type: "object",
        properties: { direction: { type: "string", enum: ["up", "down"] } },
        required: ["direction"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_go_back",
      description: "Go back to the previous page in browser history.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

export interface ToolExecution {
  name: string;
  args: Record<string, unknown>;
  summary: string;
  resultText: string;
}

function summarizeState(state: PageState): string {
  const elementLines = state.elements
    .slice(0, 60)
    .map((el) => `[${el.id}] <${el.tag}${el.inputType ? ` type=${el.inputType}` : ""}> ${el.text || el.href || "(no label)"}`)
    .join("\n");
  return [
    `URL: ${state.url}`,
    `TITLE: ${state.title}`,
    `VISIBLE TEXT (truncated):\n${state.text.slice(0, 1500)}`,
    `INTERACTIVE ELEMENTS:\n${elementLines || "(none found)"}`,
  ].join("\n\n");
}

export async function runTool(name: string, rawArgs: string): Promise<ToolExecution> {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return { name, args: {}, summary: `${name} (bad arguments)`, resultText: "Error: could not parse tool arguments as JSON." };
  }

  try {
    switch (name) {
      case "read_page": {
        const state = await browser.getState();
        return { name, args, summary: `Read page: ${state.title || state.url}`, resultText: summarizeState(state) };
      }
      case "browser_navigate": {
        const url = String(args.url ?? "");
        const state = await browser.navigate(url);
        return { name, args, summary: `Opened ${url}`, resultText: summarizeState(state) };
      }
      case "browser_click": {
        const id = Number(args.id);
        const state = await browser.clickElement(id);
        return { name, args, summary: `Clicked element #${id}`, resultText: summarizeState(state) };
      }
      case "browser_type": {
        const id = Number(args.id);
        const text = String(args.text ?? "");
        const submit = Boolean(args.submit);
        const state = await browser.typeIntoElement(id, text, submit);
        return {
          name,
          args,
          summary: `Typed "${text}" into #${id}${submit ? " and submitted" : ""}`,
          resultText: summarizeState(state),
        };
      }
      case "browser_scroll": {
        const direction = args.direction === "up" ? "up" : "down";
        const state = await browser.scrollPage(direction);
        return { name, args, summary: `Scrolled ${direction}`, resultText: summarizeState(state) };
      }
      case "browser_go_back": {
        const state = await browser.goBack();
        return { name, args, summary: "Went back", resultText: summarizeState(state) };
      }
      default:
        return { name, args, summary: `Unknown tool ${name}`, resultText: `Error: no such tool "${name}".` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { name, args, summary: `${name} failed: ${message}`, resultText: `Error: ${message}` };
  }
}
