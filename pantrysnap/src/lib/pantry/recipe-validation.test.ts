import { describe, expect, it } from "vitest";
import type { RawRecipe } from "./ai-output";
import {
  parseExclusions,
  plainCount,
  stepDurations,
  validateRecipes,
  verifyRecipe,
  violatesDiet,
  type Constraints,
} from "./recipe-validation";

describe("violatesDiet", () => {
  it.each([
    ["chicken breast", "Vegetarian", true],
    ["fish sauce", "Vegetarian", true],
    ["Worcestershire sauce", "Vegetarian", true],
    ["chicken broth", "Vegetarian", true],
    ["gelatin", "Vegetarian", true],
    ["vegetable stock", "Vegetarian", false],
    ["eggs", "Vegetarian", false],
    ["eggs", "Vegan", true],
    ["butter", "Vegan", true],
    ["honey", "Vegan", true],
    ["peanut butter", "Vegan", false],
    ["almond milk", "Vegan", false],
    ["eggplant", "Vegan", false],
    ["all-purpose flour", "Gluten-free", true],
    ["soy sauce", "Gluten-free", true],
    ["tamari", "Gluten-free", false],
    ["rice noodles", "Gluten-free", false],
    ["gluten-free pasta", "Gluten-free", false],
    ["spaghetti", "Gluten-free", true],
    ["bacon", "None", false],
  ] as const)("%s under %s → %s", (name, diet, expected) => {
    expect(violatesDiet(name, diet)).toBe(expected);
  });
});

describe("stepDurations", () => {
  it.each([
    ["Simmer for 20 minutes.", [20]],
    ["Bake 25-30 mins until golden.", [25]],
    ["Marinate for at least 2 hours, then grill 10 minutes.", [120, 10]],
    ["Rest 1 1/2 hours.", [90]],
    ["Chill overnight.", [480]],
    ["Cook for half an hour.", [30]],
    ["Fry for a minute or two.", [1]],
    ["Preheat oven to 400°F.", []],
  ])("%s", (step, expected) => {
    expect(stepDurations(step)).toEqual(expected);
  });
});

describe("plainCount", () => {
  it.each([
    ["4", 4],
    ["4 large", 4],
    ["6 eggs", 6],
    ["a dozen", 12],
    ["1 cup", null],
    ["200 g", null],
    ["2-3", null],
    ["half block", null],
    ["", null],
  ])("%s → %s", (q, expected) => {
    expect(plainCount(q)).toBe(expected);
  });
});

describe("parseExclusions", () => {
  const labels = (note: string) => parseExclusions(note).map((e) => e.label);
  it.each([
    ["no mushrooms", ["mushroom"]],
    ["without onion or garlic please", ["onion", "garlic"]],
    ["dairy-free, and not spicy", ["dairy", "spicy"]],
    ["I'm allergic to peanuts.", ["peanut"]],
    ["I don't like olives", ["olive"]],
    ["something crispy", []],
    ["I want something filling", []],
    ["something like Chipotle", []],
    ["no more than 5 ingredients", []],
    ["nothing too heavy", []],
    ["no oven", ["oven"]],
    ["no mushrooms, something crispy", ["mushroom"]],
    ["no onions, peppers or olives", ["onion", "bell pepper", "olive"]],
  ])("%s → %j", (note, expected) => {
    expect(labels(note)).toEqual(expected);
  });
  it("category exclusions cover their members", () => {
    const [dairy] = parseExclusions("no dairy");
    expect(dairy?.test(["cheddar"])).toBe(true);
    expect(dairy?.test(["coconut", "milk"])).toBe(false);
    const [nuts] = parseExclusions("nut-free");
    expect(nuts?.test(["walnut"])).toBe(true);
    expect(nuts?.test(["nutmeg"])).toBe(false);
  });
});

// ---------------------------------------------------------------------------- verifyRecipe

const recipe = (over: Partial<RawRecipe> = {}): RawRecipe => ({
  name: "Spinach omelette",
  description: "",
  whyItFits: "Quick and uses your eggs.",
  servings: 2,
  prepMinutes: 5,
  cookMinutes: 10,
  ingredients: [
    { name: "eggs", measurement: "4" },
    { name: "spinach", measurement: "1 cup" },
    { name: "salt", measurement: "pinch" },
  ],
  steps: ["Whisk the eggs with salt.", "Wilt the spinach, add the eggs and cook for 5 minutes."],
  substitutes: [],
  ...over,
});

const base: Constraints = {
  inventory: [
    { name: "eggs", quantity: "6" },
    { name: "spinach", quantity: "" },
    { name: "cheddar", quantity: "" },
    { name: "milk", quantity: "" },
    { name: "chicken breast", quantity: "" },
    { name: "jalapeno", quantity: "" },
  ],
  servings: 2,
  maxMinutes: "30",
  diet: "None",
  highProtein: false,
  spicy: false,
  kidFriendly: false,
  exclusions: [],
};

const verify = (over: Partial<RawRecipe> = {}, c: Partial<Constraints> = {}) =>
  verifyRecipe(recipe(over), { ...base, ...c });

describe("verifyRecipe — availability", () => {
  it("claims everything on hand only when it is", () => {
    const r = verify();
    expect(r.ok && r.recipe.everythingOnHand).toBe(true);
    expect(r.ok && r.recipe.matchPercent).toBe(100);
  });

  it("computes missing items itself", () => {
    const r = verify({
      ingredients: [
        { name: "eggs", measurement: "4" },
        { name: "heavy cream", measurement: "1/4 cup" },
        { name: "shallot", measurement: "1" },
      ],
      steps: ["Whisk the eggs and cream.", "Cook for 5 minutes."],
    });
    expect(r.ok && r.recipe.missing).toEqual(["heavy cream", "shallot"]);
    expect(r.ok && r.recipe.everythingOnHand).toBe(false);
    expect(r.ok && r.recipe.matchPercent).toBe(33);
  });

  it("catches ingredients that only appear in the steps", () => {
    const r = verify({
      steps: [
        "Whisk the eggs.",
        "Heat the olive oil, wilt the spinach, then drizzle with sesame oil and serve with rice.",
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.recipe.everythingOnHand).toBe(false);
    expect(r.recipe.missing).toEqual(["olive oil", "sesame oil", "rice"]);
    expect(r.recipe.ingredients.filter((i) => i.fromSteps).map((i) => i.name)).toEqual([
      "olive oil",
      "sesame oil",
      "rice",
    ]);
  });

  it("does not flag step mentions already covered by the list", () => {
    const r = verify({
      ingredients: [
        { name: "large eggs", measurement: "4" },
        { name: "cheddar cheese", measurement: "30 g" },
      ],
      steps: ["Beat the eggs.", "Scatter over the cheese and fold."],
    });
    expect(r.ok && r.recipe.missing).toEqual([]);
    expect(r.ok && r.recipe.ingredients.some((i) => i.fromSteps)).toBe(false);
  });

  it("a more specific step mention is not covered by a generic listed item", () => {
    const r = verify(
      {
        ingredients: [...recipe().ingredients, { name: "oil", measurement: "1 tbsp" }],
        steps: ["Whisk the eggs.", "Fry in oil, then finish with a drizzle of sesame oil."],
      },
      { inventory: [...base.inventory, { name: "oil", quantity: "" }] },
    );
    expect(r.ok && r.recipe.missing).toEqual(["sesame oil"]);
  });

  it("ignores optional and negated mentions in steps", () => {
    const r = verify({
      steps: [
        "Whisk the eggs; add the spinach.",
        "Optional: top with chili flakes.",
        "Cook without butter for 5 minutes.",
      ],
    });
    expect(r.ok && r.recipe.everythingOnHand).toBe(true);
  });

  it("step-only ingredients that break the diet are caught", () => {
    const r = verify(
      { steps: ["Whisk the eggs.", "Crumble bacon over the top."] },
      { diet: "Vegetarian" },
    );
    expect(r).toEqual({ ok: false, reason: "diet" });
  });

  it("flags amounts that are clearly short", () => {
    const r = verify({
      ingredients: [
        { name: "eggs", measurement: "8" },
        { name: "spinach", measurement: "" },
      ],
    });
    expect(r.ok && r.recipe.everythingOnHand).toBe(false);
    expect(r.ok && r.recipe.ingredients[0]?.short).toEqual({ need: 8, have: 6 });
  });

  it("rejects recipes that use nothing on hand or need too much", () => {
    expect(
      verify({
        ingredients: [{ name: "saffron", measurement: "" }],
        steps: ["Bloom saffron 5 minutes."],
      }),
    ).toEqual({
      ok: false,
      reason: "nothing_on_hand",
    });
    expect(
      verify({
        ingredients: ["eggs", "a", "b", "c", "d"].map((name) => ({ name, measurement: "" })),
        steps: ["Mix."],
      }),
    ).toEqual({ ok: false, reason: "too_many_missing" });
  });
});

describe("verifyRecipe — time", () => {
  it("rejects stated times over the limit", () => {
    expect(verify({ cookMinutes: 40 })).toEqual({ ok: false, reason: "time" });
  });
  it("rejects a stated time contradicted by a single step", () => {
    expect(
      verify({
        prepMinutes: 5,
        cookMinutes: 10,
        steps: ["Whisk the eggs.", "Bake for 45 minutes."],
      }),
    ).toEqual({ ok: false, reason: "time_contradiction" });
  });
  it("raises the shown time to the longest step", () => {
    const r = verify({
      prepMinutes: 5,
      cookMinutes: 5,
      steps: ["Whisk the eggs.", "Simmer the spinach 20 minutes."],
    });
    expect(r.ok && r.recipe.totalMinutes).toBe(20);
  });
  it("shows a range when steps add up to more than stated", () => {
    const r = verify(
      {
        prepMinutes: 5,
        cookMinutes: 20,
        steps: ["Whisk the eggs 5 minutes.", "Cook spinach 20 minutes.", "Rest 15 minutes."],
      },
      { maxMinutes: "60+" },
    );
    expect(r.ok && r.recipe.totalMinutes).toBe(25);
    expect(r.ok && r.recipe.totalMinutesUpper).toBe(40);
    expect(r.ok && r.recipe.checks).not.toContain("Quick");
  });
});

describe("verifyRecipe — servings", () => {
  it("rejects a different stated serving count", () => {
    expect(verify({ servings: 4 })).toEqual({ ok: false, reason: "servings" });
    expect(verify({ description: "Serves 4 hungry people." })).toEqual({
      ok: false,
      reason: "servings",
    });
  });
  it("does not claim servings the AI didn't state", () => {
    const r = verify({ servings: null });
    expect(r.ok && r.recipe.servingsStated).toBe(false);
    expect(r.ok && r.recipe.servings).toBe(2);
  });
  it("does not treat 'makes 12 pancakes' as servings", () => {
    expect(verify({ description: "Makes 12 small pancakes." }).ok).toBe(true);
  });
});

describe("verifyRecipe — requested traits and free text", () => {
  it("high protein needs a real protein source and shows it", () => {
    const r = verify({}, { highProtein: true });
    expect(r.ok && r.recipe.checks).toContain("Protein: eggs");
    expect(
      verify(
        {
          ingredients: [
            { name: "spinach", measurement: "" },
            { name: "milk", measurement: "" },
          ],
          steps: ["Blend."],
        },
        { highProtein: true },
      ),
    ).toEqual({ ok: false, reason: "not_high_protein" });
  });
  it("spicy needs a spicy ingredient; kid-friendly refuses one", () => {
    expect(verify({}, { spicy: true })).toEqual({ ok: false, reason: "not_spicy" });
    const spicy = recipe({
      ingredients: [...recipe().ingredients, { name: "jalapeno", measurement: "1" }],
    });
    const r = verifyRecipe(spicy, { ...base, spicy: true });
    expect(r.ok && r.recipe.checks).toContain("Heat: jalapeno");
    expect(verifyRecipe(spicy, { ...base, kidFriendly: true })).toEqual({
      ok: false,
      reason: "too_spicy_for_kids",
    });
  });
  it("exclusions from the free-text request are enforced in ingredients and steps", () => {
    expect(verify({}, { exclusions: parseExclusions("no spinach") })).toEqual({
      ok: false,
      reason: "excluded",
    });
    expect(
      verify(
        { steps: ["Whisk the eggs.", "Bake in the oven 10 minutes."] },
        { exclusions: parseExclusions("no oven") },
      ),
    ).toEqual({ ok: false, reason: "excluded" });
    const ok = verify({}, { exclusions: parseExclusions("no mushrooms") });
    expect(ok.ok && ok.recipe.checks).toContain("No mushroom");
  });
});

describe("verifyRecipe — substitutions", () => {
  it("keeps only swaps from a missing item to something on hand that fits the constraints", () => {
    const r = verify(
      {
        ingredients: [
          { name: "eggs", measurement: "" },
          { name: "heavy cream", measurement: "" },
        ],
        steps: ["Whisk the eggs with the cream."],
        substitutes: [
          { from: "heavy cream", to: "milk" },
          { from: "heavy cream", to: "creme fraiche" },
          { from: "eggs", to: "milk" },
          { from: "heavy cream", to: "chicken breast" },
        ],
      },
      { diet: "Vegetarian" },
    );
    expect(r.ok && r.recipe.substitutes).toEqual([{ from: "heavy cream", to: "milk" }]);
  });
});

describe("validateRecipes", () => {
  it("drops duplicates, orders everything-on-hand first, caps results", () => {
    const many = [
      recipe({
        name: "Needs cream",
        ingredients: [...recipe().ingredients, { name: "cream", measurement: "" }],
      }),
      recipe({ name: "All here" }),
      recipe({ name: "all here" }),
      ...Array.from({ length: 6 }, (_, i) => recipe({ name: `R${i}` })),
    ];
    const { recipes, rejected } = validateRecipes(many, base);
    expect(recipes).toHaveLength(4);
    expect(recipes[0]?.everythingOnHand).toBe(true);
    expect(rejected).toContainEqual({ name: "all here", reason: "duplicate" });
    expect(recipes.every((r) => r.matchPercent <= 100)).toBe(true);
  });
});
