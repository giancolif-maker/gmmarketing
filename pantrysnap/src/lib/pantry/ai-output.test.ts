import { describe, expect, it } from "vitest";
import { extractJson, parseDetection, parseRecipes } from "./ai-output";

describe("extractJson", () => {
  it("parses plain, fenced and prose-wrapped JSON", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Sure! Here you go: {"a":1} Enjoy.')).toEqual({ a: 1 });
  });
  it("returns undefined for non-JSON", () => {
    expect(extractJson("Sure! Here are the ingredients: eggs, milk")).toBeUndefined();
    expect(extractJson("")).toBeUndefined();
  });
});

describe("parseDetection", () => {
  it("accepts objects and bare strings, dedupes and cleans names", () => {
    const r = parseDetection(
      JSON.stringify({
        ingredients: [
          { name: " Eggs ", quantity: 6 },
          "eggs",
          "spinach",
          { name: "<b>milk</b>", quantity: null },
          { name: "" },
          { nope: true },
          42,
        ],
      }),
    );
    expect(r).toEqual({
      ok: true,
      value: [
        { name: "Eggs", quantity: "6" },
        { name: "spinach", quantity: "" },
        { name: "b milk /b", quantity: "" },
      ],
    });
  });
  it("rejects responses without an ingredients array", () => {
    expect(parseDetection('{"items":["milk"]}')).toEqual({ ok: false });
    expect(parseDetection("I can't see anything")).toEqual({ ok: false });
    expect(parseDetection('{"ingredients":"milk"}')).toEqual({ ok: false });
  });
  it("accepts an empty list (caller reports NO_INGREDIENTS)", () => {
    expect(parseDetection('{"ingredients":[]}')).toEqual({ ok: true, value: [] });
  });
  it("caps the number of ingredients", () => {
    const many = Array.from({ length: 500 }, (_, i) => `item ${i}`);
    const r = parseDetection(JSON.stringify({ ingredients: many }));
    expect(r.ok && r.value.length).toBe(60);
  });
});

describe("parseRecipes", () => {
  const good = {
    name: "Omelette",
    description: "Quick",
    prepMinutes: "5",
    cookMinutes: 10,
    ingredients: [{ name: "eggs", measurement: "3" }, "spinach"],
    steps: ["Whisk", "Cook"],
  };
  it("keeps valid recipes and drops incomplete ones instead of crashing", () => {
    const r = parseRecipes(
      JSON.stringify({ recipes: [good, { name: "Toast" }, { ...good, steps: [] }, null] }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(1);
    expect(r.value[0]).toMatchObject({
      name: "Omelette",
      prepMinutes: 5,
      cookMinutes: 10,
      substitutes: [],
      ingredients: [
        { name: "eggs", measurement: "3" },
        { name: "spinach", measurement: "" },
      ],
    });
  });
  it("tolerates a malformed substitutes field", () => {
    const r = parseRecipes(JSON.stringify({ recipes: [{ ...good, substitutes: "none" }] }));
    expect(r.ok && r.value[0]?.substitutes).toEqual([]);
  });
  it("rejects absurd times", () => {
    const r = parseRecipes(JSON.stringify({ recipes: [{ ...good, cookMinutes: -5 }] }));
    expect(r.ok && r.value).toEqual([]);
  });
  it("rejects non-recipe payloads", () => {
    expect(parseRecipes("I can't help with that")).toEqual({ ok: false });
    expect(parseRecipes('{"recipes":{}}')).toEqual({ ok: false });
  });
});
