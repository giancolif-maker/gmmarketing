// Regression: a successful scan/typed session was charged and then discarded (UNKNOWN error)
// when reading the usage summary afterwards failed (simulation L18/L21).
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  calls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  summaryFails: false,
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      db.calls.push({ fn, args });
      if (fn === "begin_usage")
        return { data: { ok: true, id: "00000000-0000-4000-8000-000000000001" }, error: null };
      if (fn === "usage_summary")
        return db.summaryFails
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
      return { data: true, error: null };
    },
  },
}));

const DETECTED = {
  choices: [
    {
      message: {
        content:
          '{"ingredients":[{"name":"eggs","quantity":"6"},{"name":"spinach","quantity":""}]}',
      },
    },
  ],
};
vi.stubGlobal("fetch", async () => new Response(JSON.stringify(DETECTED), { status: 200 }));
process.env["LOVABLE_API_KEY"] = "test";

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

const { runDetect, runTyped } = await import("./pantry.server");
const count = (fn: string) => db.calls.filter((c) => c.fn === fn).length;

describe("a successful session is never lost after it has been charged", () => {
  beforeEach(() => {
    db.calls = [];
    db.summaryFails = true;
  });

  it("scan: usage read fails → user still gets the ingredients, charged once", async () => {
    const r = await runDetect("user-1", { images: [JPEG] }, undefined);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ingredients.map((i) => i.name)).toEqual(["eggs", "spinach"]);
    expect(r.usage).toBeNull();
    expect(count("begin_usage")).toBe(1);
    expect(db.calls.filter((c) => c.fn === "finish_usage").map((c) => c.args["p_status"])).toEqual([
      "complete",
    ]);
  });

  it("typed: usage read fails → user still gets the list, charged once", async () => {
    const r = await runTyped("user-1", { text: "eggs, spinach" });
    expect(r.ok).toBe(true);
    expect(r.ok && r.ingredients.length).toBe(2);
    expect(r.ok && r.usage).toBeNull();
    expect(count("begin_usage")).toBe(1);
    expect(count("finish_usage")).toBe(1);
  });

  it("scanned items come back unconfirmed; typed items come back confirmed", async () => {
    db.summaryFails = false;
    const scan = await runDetect("user-1", { images: [JPEG] }, undefined);
    expect(scan.ok && scan.ingredients.every((i) => i.confirmed === false)).toBe(true);
    expect(scan.ok && scan.usage?.scansUsed).toBe(1);
    const typed = await runTyped("user-1", { text: "eggs" });
    expect(typed.ok && typed.ingredients.every((i) => i.confirmed === true)).toBe(true);
  });
});
