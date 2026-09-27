import { describe, expect, it } from "vitest";
import type { Recipe } from "../src/lib/pantry/schemas";
import { auditRecipe, median, parseExpected, percentile, scoreDetection } from "./scoring";

const ing = (...names: string[]) => names.map((name) => ({ name, quantity: "" }));

describe("parseExpected", () => {
  it("reads one per line, comments, [hard], de-duplicates", () => {
    expect(parseExpected("# fridge\neggs\nScallions [hard]\n\ngreen onion\nmilk # door")).toEqual([
      { name: "eggs", hard: false },
      { name: "scallions", hard: true },
      { name: "milk", hard: false },
    ]);
  });
  it("refuses template placeholders", () => {
    expect(parseExpected("PLACEHOLDER — replace me\neggs")).toBeNull();
  });
});

describe("scoreDetection", () => {
  it("computes precision/recall with false positives and negatives", () => {
    const s = scoreDetection(
      ing("eggs", "milk", "ketchup"),
      parseExpected("eggs\nmilk\nspinach\nbutter")!,
    );
    expect(s.truePositives).toBe(2);
    expect(s.precision).toBeCloseTo(2 / 3);
    expect(s.recall).toBe(0.5);
    expect(s.falsePositives).toEqual(["ketchup"]);
    expect(s.falseNegatives.map((f) => f.name)).toEqual(["spinach", "butter"]);
  });
  it("matches one-to-one: one generic detection can't claim several expected items", () => {
    const s = scoreDetection(ing("cheese"), parseExpected("cheddar\nmozzarella\nparmesan")!);
    expect(s.truePositives).toBe(1); // counts once, as a non-strict match, not three times
    expect(s.strictTruePositives).toBe(0);
    expect(s.falseNegatives).toHaveLength(2);
    const t = scoreDetection(ing("cheddar"), parseExpected("cheese\ncheese slices")!);
    expect(t.truePositives).toBe(1);
    expect(t.falseNegatives).toHaveLength(1);
  });
  it("separates strict from rule-based matches", () => {
    const s = scoreDetection(
      ing("scallions", "cheddar cheese"),
      parseExpected("green onion\ncheddar")!,
    );
    expect(s.truePositives).toBe(2);
    expect(s.strictTruePositives).toBe(1); // scallions == green onion by key; cheddar via rule
    expect(s.matches.find((m) => m.expected === "cheddar")?.strict).toBe(false);
  });
  it("keeps hard items in the denominator", () => {
    const s = scoreDetection(ing("eggs"), parseExpected("eggs\ntofu [hard]")!);
    expect(s.recall).toBe(0.5);
    expect(s.hardExpected).toBe(1);
    expect(s.hardFound).toBe(0);
  });
  it("zero detections give zero recall and no precision", () => {
    const s = scoreDetection([], parseExpected("eggs")!);
    expect(s.recall).toBe(0);
    expect(s.precision).toBeNull();
  });
});

const recipe = (over: Partial<Recipe>): Recipe => ({
  id: "r1",
  name: "Omelette",
  description: "",
  whyItFits: "",
  prepMinutes: 5,
  cookMinutes: 5,
  totalMinutes: 10,
  totalMinutesUpper: null,
  servings: 2,
  servingsStated: true,
  matchPercent: 100,
  everythingOnHand: true,
  missing: [],
  ingredients: [
    { name: "eggs", measurement: "", status: "have", fromSteps: false, short: null },
    { name: "chicken", measurement: "", status: "have", fromSteps: false, short: null },
    { name: "salt", measurement: "", status: "staple", fromSteps: false, short: null },
  ],
  steps: [],
  substitutes: [],
  checks: [],
  ...over,
});

describe("auditRecipe", () => {
  it("flags a false 'Everything on hand' caused by a hallucinated detection", () => {
    const a = auditRecipe(recipe({}), ["eggs", "tofu"]);
    expect(a.falseEverythingOnHand).toBe(true);
    expect(a.wronglyHave).toEqual(["chicken"]);
  });
  it("confirms a correct claim", () => {
    const a = auditRecipe(recipe({}), ["eggs", "chicken thighs"]);
    expect(a.falseEverythingOnHand).toBe(false);
    expect(a.items.map((i) => i.truth)).toEqual(["have", "have", "staple"]);
  });
  it("reports items marked missing that were actually there", () => {
    const r = recipe({
      everythingOnHand: false,
      ingredients: [
        { name: "eggs", measurement: "", status: "have", fromSteps: false, short: null },
        { name: "spinach", measurement: "", status: "missing", fromSteps: true, short: null },
      ],
    });
    expect(auditRecipe(r, ["eggs", "spinach"]).wronglyMissing).toEqual(["spinach"]);
  });
  it("without ground truth, makes no truth claims", () => {
    expect(auditRecipe(recipe({}), null).items.every((i) => i.truth === null)).toBe(true);
  });
});

describe("stats", () => {
  it("median / percentile", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(3);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90)).toBe(9);
    expect(median([])).toBeNull();
  });
});
