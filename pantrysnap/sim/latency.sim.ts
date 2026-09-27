// ADVERSARIAL SIMULATION — latency & failure. Runs the REAL server orchestration
// (pantry.server.ts → ai-pipeline.server.ts) with a scripted fake AI gateway and a scripted
// fake database, to check: clear outcome, no double charge, no false success, bounded time.
// UI rendering of these outcomes was verified earlier with Playwright (see phase reports).
import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs";
import path from "node:path";
import { expect, it, vi } from "vitest";

type Step = { delayMs?: number; status?: number; body?: string };
type Scenario = {
  id: string;
  kind: "detect" | "typed" | "recipes";
  what: string;
  ai: Step[];
  db?: { begin?: "error" | string; finish?: "error"; summary?: "error"; log?: "error" };
  abortAfterMs?: number;
  image?: "invalid";
};
type Ctx = {
  s: Scenario;
  aiCalls: number;
  rpc: Array<{ fn: string; args: Record<string, unknown> }>;
};
const store = new AsyncLocalStorage<Ctx>();

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      const ctx = store.getStore()!;
      ctx.rpc.push({ fn, args });
      const db = ctx.s.db ?? {};
      if (fn === "begin_usage") {
        if (db.begin === "error") return { data: null, error: { message: "connection refused" } };
        if (db.begin) return { data: { ok: false, code: db.begin }, error: null };
        return {
          data: { ok: true, id: "00000000-0000-4000-8000-00000000000" + (ctx.rpc.length % 10) },
          error: null,
        };
      }
      if (fn === "finish_usage")
        return db.finish === "error"
          ? { data: null, error: { message: "timeout" } }
          : { data: null, error: null };
      if (fn === "usage_summary")
        return db.summary === "error"
          ? { data: null, error: { message: "timeout" } }
          : {
              data: {
                is_pro: false,
                is_anonymous: false,
                scans_used: 1,
                scan_limit: 3,
                resets_at: null,
              },
              error: null,
            };
      if (fn === "log_event")
        return db.log === "error"
          ? { data: null, error: { message: "timeout" } }
          : { data: true, error: null };
      return { data: null, error: { message: "unknown fn" } };
    },
  },
}));

const DETECT_OK = JSON.stringify({
  choices: [
    {
      message: {
        content:
          '{"ingredients":[{"name":"eggs","quantity":"6"},{"name":"spinach","quantity":""}]}',
      },
    },
  ],
});
const RECIPE = {
  name: "Spinach eggs",
  description: "",
  whyItFits: "",
  servings: 2,
  prepMinutes: 3,
  cookMinutes: 5,
  ingredients: [
    { name: "eggs", measurement: "3" },
    { name: "spinach", measurement: "1 cup" },
  ],
  steps: ["Scramble eggs with spinach 4 minutes."],
};
const RECIPES_OK = JSON.stringify({
  choices: [{ message: { content: JSON.stringify({ recipes: [RECIPE] }) } }],
});
const RECIPES_ALL_BAD = JSON.stringify({
  choices: [
    { message: { content: JSON.stringify({ recipes: [{ ...RECIPE, cookMinutes: 90 }] }) } },
  ],
});
const GARBAGE = JSON.stringify({ choices: [{ message: { content: "Sure! eggs and spinach" } }] });
const EMPTY = JSON.stringify({ choices: [{ message: { content: "" } }] });

const realFetch = globalThis.fetch;
vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(typeof input === "string" ? input : ((input as Request).url ?? input));
  if (!url.includes("ai.gateway.lovable.dev")) return realFetch(input, init);
  const ctx = store.getStore()!;
  const step = ctx.s.ai[Math.min(ctx.aiCalls, ctx.s.ai.length - 1)] ?? {};
  ctx.aiCalls++;
  if (step.delayMs) {
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, step.delayMs);
      init?.signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(t);
          reject(new DOMException("aborted", "AbortError"));
        },
        { once: true },
      );
    });
  }
  return new Response(step.body ?? "", { status: step.status ?? 200 });
});
process.env["LOVABLE_API_KEY"] = "simulated";

const JPEG = (() => {
  const seg = (m: number, p: number[]) => [
    0xff,
    m,
    (p.length + 2) >> 8,
    (p.length + 2) & 0xff,
    ...p,
  ];
  const bytes = [
    0xff,
    0xd8,
    ...seg(0xdb, new Array(65).fill(1)),
    ...seg(0xda, [1, 2, 3]),
    ...new Array(200).fill(0x55),
    0xff,
    0xd9,
  ];
  return "data:image/jpeg;base64," + Buffer.from(bytes).toString("base64");
})();

const d = (ms: number, body = DETECT_OK): Step => ({ delayMs: ms, body });
const r = (ms: number, body = RECIPES_OK): Step => ({ delayMs: ms, body });

const SCENARIOS: Scenario[] = [
  { id: "L01", kind: "detect", what: "instant response", ai: [d(0)] },
  { id: "L02", kind: "detect", what: "2 s response", ai: [d(2000)] },
  { id: "L03", kind: "detect", what: "5 s response", ai: [d(5000)] },
  { id: "L04", kind: "detect", what: "10 s response", ai: [d(10000)] },
  { id: "L05", kind: "detect", what: "20 s response", ai: [d(20000)] },
  { id: "L06", kind: "detect", what: "35 s response (past 30 s attempt timeout)", ai: [d(35000)] },
  { id: "L07", kind: "detect", what: "malformed, then OK (retry)", ai: [d(500, GARBAGE), d(500)] },
  { id: "L08", kind: "detect", what: "malformed twice (retry failure)", ai: [d(500, GARBAGE)] },
  { id: "L09", kind: "detect", what: "empty completion twice", ai: [d(300, EMPTY)] },
  { id: "L10", kind: "detect", what: "503, then OK", ai: [{ delayMs: 300, status: 503 }, d(500)] },
  { id: "L11", kind: "detect", what: "503 twice", ai: [{ delayMs: 300, status: 503 }] },
  {
    id: "L12",
    kind: "detect",
    what: "503 after 25 s, then 20 s OK (retry near budget)",
    ai: [{ delayMs: 25000, status: 503 }, d(20000)],
  },
  {
    id: "L13",
    kind: "detect",
    what: "429 rate limit from gateway",
    ai: [{ delayMs: 200, status: 429 }],
  },
  { id: "L14", kind: "detect", what: "user cancels after 3 s", ai: [d(15000)], abortAfterMs: 3000 },
  { id: "L15", kind: "detect", what: "invalid image upload", ai: [d(0)], image: "invalid" },
  {
    id: "L16",
    kind: "detect",
    what: "DB down at start (begin_usage fails)",
    ai: [d(0)],
    db: { begin: "error" },
  },
  {
    id: "L17",
    kind: "detect",
    what: "DB fails when settling a successful scan (finish_usage)",
    ai: [d(500)],
    db: { finish: "error" },
  },
  {
    id: "L18",
    kind: "detect",
    what: "DB fails reading usage after a successful scan",
    ai: [d(500)],
    db: { summary: "error" },
  },
  { id: "L19", kind: "detect", what: "analytics insert fails", ai: [d(500)], db: { log: "error" } },
  {
    id: "L20",
    kind: "detect",
    what: "monthly quota exhausted",
    ai: [d(0)],
    db: { begin: "QUOTA_EXCEEDED" },
  },
  {
    id: "L21",
    kind: "typed",
    what: "typed session, DB fails reading usage afterwards",
    ai: [],
    db: { summary: "error" },
  },
  { id: "L22", kind: "recipes", what: "10 s recipes", ai: [r(10000)] },
  { id: "L23", kind: "recipes", what: "45 s recipes (past 40 s attempt timeout)", ai: [r(45000)] },
  { id: "L24", kind: "recipes", what: "malformed twice", ai: [r(500, GARBAGE)] },
  {
    id: "L25",
    kind: "recipes",
    what: "all recipes rejected by verification, twice",
    ai: [r(500, RECIPES_ALL_BAD)],
  },
  {
    id: "L26",
    kind: "recipes",
    what: "rejected, then valid on retry",
    ai: [r(500, RECIPES_ALL_BAD), r(500)],
  },
  {
    id: "L27",
    kind: "recipes",
    what: "scan expired / foreign scan id",
    ai: [r(0)],
    db: { begin: "SCAN_EXPIRED" },
  },
  {
    id: "L28",
    kind: "recipes",
    what: "DB fails when settling successful recipes",
    ai: [r(500)],
    db: { finish: "error" },
  },
];

it("latency & failure simulation", { timeout: 180_000 }, async () => {
  const { runDetect, runRecipes, runTyped } = await import("../src/lib/pantry/pantry.server");
  const { ERROR_MESSAGES } = await import("../src/lib/pantry/errors");
  const results = await Promise.all(
    SCENARIOS.map((s) =>
      store.run({ s, aiCalls: 0, rpc: [] }, async () => {
        const ctx = store.getStore()!;
        const controller = new AbortController();
        if (s.abortAfterMs) setTimeout(() => controller.abort(), s.abortAfterMs);
        const t0 = Date.now();
        const res =
          s.kind === "detect"
            ? await runDetect(
                "u1",
                {
                  images: [
                    s.image === "invalid" ? "data:image/jpeg;base64,aGVsbG8gd29ybGQ=" : JPEG,
                  ],
                },
                controller.signal,
              )
            : s.kind === "typed"
              ? await runTyped("u1", { text: "eggs, spinach" })
              : await runRecipes(
                  "u1",
                  {
                    scanId: "00000000-0000-4000-8000-000000000001",
                    ingredients: [
                      { name: "eggs", quantity: "6" },
                      { name: "spinach", quantity: "" },
                    ],
                    servings: 2,
                    maxMinutes: "30",
                    mealType: "Dinner",
                    diet: "None",
                    highProtein: false,
                    spicy: false,
                    kidFriendly: false,
                    cuisine: "Any",
                    note: "",
                  },
                  controller.signal,
                );
        const ms = Date.now() - t0;
        const begins = ctx.rpc.filter((x) => x.fn === "begin_usage").length;
        const finishes = ctx.rpc
          .filter((x) => x.fn === "finish_usage")
          .map((x) => x.args["p_status"]);
        const aiProduced =
          ctx.aiCalls > 0 && !["L08", "L09", "L11", "L13", "L24", "L25"].includes(s.id);
        const issues: string[] = [];
        if (begins > 1) issues.push("charged more than once");
        if (!res.ok && res.code === "UNKNOWN") issues.push("generic 'Something went wrong'");
        if (!res.ok && finishes.includes("complete"))
          issues.push("CHARGED but user got an error (result lost)");
        if (res.ok && !aiProduced && s.kind !== "typed") issues.push("false success");
        if (s.db?.finish === "error")
          issues.push("ledger row stays 'pending' → counts as used even if later lost");
        if (ms > 85_000) issues.push("exceeds 90 s client timeout");
        return {
          s,
          ms,
          res: res.ok ? "ok" : res.code,
          message: res.ok ? "(results shown)" : ERROR_MESSAGES[res.code],
          aiCalls: ctx.aiCalls,
          begins,
          finishes,
          issues,
        };
      }),
    ),
  );
  const L = [
    `## 8. Latency & failure simulation (real server orchestration, scripted gateway + database)`,
    `Client timeout is 90 s. Detection: 30 s per attempt, 50 s budget. Recipes: 40 s per attempt, 70 s budget. Only malformed/empty output and 5xx/network errors are retried; timeouts and 4xx are not.\n`,
    `| ID | Scenario | Outcome | User sees | Time | AI calls | Ledger (begin → finish) | Problems |`,
    `|---|---|---|---|---|---|---|---|`,
    ...results.map(
      (x) =>
        `| ${x.s.id} | ${x.s.kind}: ${x.s.what} | ${x.res} | ${x.message} | ${(x.ms / 1000).toFixed(1)} s | ${x.aiCalls} | ${x.begins} → ${x.finishes.join(",") || "—"} | ${x.issues.length ? "❌ " + x.issues.join("; ") : "✅"} |`,
    ),
  ];
  fs.mkdirSync(path.join(__dirname, "results"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "results", "latency.md"), L.join("\n") + "\n");
  expect(results.length).toBe(SCENARIOS.length);
});
