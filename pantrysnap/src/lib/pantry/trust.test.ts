// Regression tests for the trust failures found by the adversarial simulation (sim/FINDINGS.md).
// Each block names the failure it pins down.
import { describe, expect, it } from "vitest";
import type { RawRecipe } from "./ai-output";
import { covers, mentionedIngredients, normalizeIngredients } from "./ingredients";
import {
  checkTime,
  parseExclusions,
  stepDurations,
  validateRecipes,
  verifyRecipe,
  type Constraints,
} from "./recipe-validation";
import { ingredientSchema, recipesRequestSchema } from "./schemas";

const recipe = (over: Partial<RawRecipe> = {}): RawRecipe => ({
  name: "Test dish",
  description: "",
  whyItFits: "",
  servings: 2,
  prepMinutes: 5,
  cookMinutes: 10,
  ingredients: [
    { name: "eggs", measurement: "" },
    { name: "spinach", measurement: "" },
  ],
  steps: ["Whisk the eggs.", "Wilt the spinach with the eggs."],
  substitutes: [],
  ...over,
});

const item = (name: string, confirmed = true) => ({ name, quantity: "", confirmed });

const base: Constraints = {
  inventory: [item("eggs"), item("spinach")],
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

// ---------------------------------------------------------------------------- 1. detected ≠ confirmed

describe("scanned items the user has not confirmed never support 'everything on hand'", () => {
  // [what vision put on the list, what the recipe uses]
  it.each([
    ["hallucinated ingredient left unedited", "butter", "butter"],
    ["hallucinated protein", "bacon", "bacon"],
    ["tofu misread as chicken", "chicken breast", "chicken breast"],
    ["coconut milk misread as milk", "milk", "milk"],
    ["greek yogurt misread as sour cream", "sour cream", "sour cream"],
  ])("%s", (_, detected, used) => {
    const r = verify(
      {
        ingredients: [...recipe().ingredients, { name: used, measurement: "" }],
        steps: ["Whisk the eggs.", "Wilt the spinach with the eggs."],
      },
      { inventory: [...base.inventory, item(detected, false)] },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.recipe.everythingOnHand).toBe(false);
    expect(r.recipe.unconfirmed).toEqual([used]);
    expect(r.recipe.missing).toEqual([]);
    expect(r.recipe.ingredients.find((i) => i.name === used)?.status).toBe("unconfirmed");
    expect(r.recipe.matchPercent).toBe(67);

    // Once the user confirms the item, the claim is allowed.
    const confirmed = verify(
      { ingredients: [...recipe().ingredients, { name: used, measurement: "" }] },
      { inventory: [...base.inventory, item(detected, true)] },
    );
    expect(confirmed.ok && confirmed.recipe.everythingOnHand).toBe(true);
    expect(confirmed.ok && confirmed.recipe.unconfirmed).toEqual([]);
  });

  it("an unconfirmed item used only in the steps is also flagged", () => {
    const r = verify(
      { steps: ["Whisk the eggs.", "Fry the spinach in butter."] },
      { inventory: [...base.inventory, item("butter", false)] },
    );
    expect(r.ok && r.recipe.everythingOnHand).toBe(false);
    expect(r.ok && r.recipe.unconfirmed).toEqual(["butter"]);
  });

  it("a confirmed item wins over an unconfirmed one that also matches", () => {
    const r = verify(
      { ingredients: [...recipe().ingredients, { name: "cheese", measurement: "" }] },
      { inventory: [...base.inventory, item("mozzarella", false), item("cheddar", true)] },
    );
    expect(r.ok && r.recipe.everythingOnHand).toBe(true);
  });

  it("recipes built only on unconfirmed items are still shown (not rejected), never as complete", () => {
    const r = verify({}, { inventory: [item("eggs", false), item("spinach", false)] });
    expect(r.ok).toBe(true);
    expect(r.ok && r.recipe.everythingOnHand).toBe(false);
    expect(r.ok && r.recipe.matchPercent).toBe(0);
  });

  it("ranks recipes that are complete on the confirmed list first", () => {
    const { recipes } = validateRecipes(
      [
        recipe({
          name: "Uses unconfirmed",
          ingredients: [...recipe().ingredients, { name: "bacon", measurement: "" }],
        }),
        recipe({ name: "All confirmed" }),
      ],
      { ...base, inventory: [...base.inventory, item("bacon", false)] },
    );
    expect(recipes.map((r) => r.name)).toEqual(["All confirmed", "Uses unconfirmed"]);
  });

  it("the flag survives normalization; older clients default to confirmed", () => {
    expect(normalizeIngredients([item("Milk", false), { name: "eggs" }])).toEqual([
      { name: "milk", quantity: "", confirmed: false },
      { name: "eggs", quantity: "", confirmed: true },
    ]);
    expect(ingredientSchema.parse({ name: "milk" })).toEqual({
      name: "milk",
      quantity: "",
      confirmed: true,
    });
    const req = recipesRequestSchema.safeParse({
      scanId: "00000000-0000-4000-8000-000000000001",
      ingredients: [item("milk", false)],
      servings: 2,
      maxMinutes: "30",
      mealType: "Dinner",
      diet: "None",
      highProtein: false,
      spicy: false,
      kidFriendly: false,
      cuisine: "Any",
      note: "",
    });
    expect(req.success && req.data.ingredients[0]?.confirmed).toBe(false);
  });
});

// ---------------------------------------------------------------------------- 2. matcher

describe("different products never match (either direction)", () => {
  it.each([
    ["sweet potatoes", "potatoes"],
    ["rice noodles", "rice"],
    ["egg noodles", "eggs"],
    ["chicken nuggets", "chicken"],
    ["milk chocolate", "milk"],
    ["condensed milk", "milk"],
    ["sweetened condensed milk", "milk"],
    ["evaporated milk", "milk"],
    ["chocolate milk", "milk"],
    ["green beans", "beans"],
    ["green onions", "onion"],
    ["frozen yogurt", "yogurt"],
    ["chicken sausage", "chicken"],
    ["olive oil", "olives"],
  ])("%s ≠ %s", (a, b) => {
    expect(covers(a, b)).toBe(false);
    expect(covers(b, a)).toBe(false);
  });
});

describe("legitimate matches still work", () => {
  it.each([
    ["green onions", "scallions"],
    ["spring onions", "green onion"],
    ["sweet potato", "sweet potatoes"],
    ["egg noodles", "egg noodles"],
    ["rice noodles", "noodles"],
    ["green beans", "string beans"],
    ["red onion", "onion"],
    ["cherry tomatoes", "tomatoes"],
    ["greek yogurt", "yogurt"],
    ["frozen peas", "peas"],
    ["frozen spinach", "spinach"],
    ["whole milk", "milk"],
    ["black beans", "beans"],
    ["goat cheese", "cheese"],
    ["cheddar cheese", "cheese"],
    ["cheddar", "cheddar cheese"],
    ["chicken breast", "chicken"],
    ["chicken", "chicken thighs"],
    ["olive oil", "oil"],
    ["eggs", "egg yolks"],
    ["dark chocolate", "chocolate"],
    ["chicken stock", "stock"],
  ])("%s ≈ %s", (inventory, recipeName) => {
    expect(covers(inventory, recipeName)).toBe(true);
  });

  it("compound products keep their own identity in step text", () => {
    expect(
      mentionedIngredients("Toss the green beans and sweet potatoes with egg noodles."),
    ).toEqual(["green bean", "sweet potato", "egg noodle"]);
  });

  it("a false product match no longer produces a complete recipe", () => {
    const r = verify(
      { ingredients: [...recipe().ingredients, { name: "potatoes", measurement: "" }] },
      { inventory: [...base.inventory, item("sweet potatoes")] },
    );
    expect(r.ok && r.recipe.everythingOnHand).toBe(false);
    expect(r.ok && r.recipe.missing).toEqual(["potatoes"]);
  });

  it("compound products still trip diet and exclusion checks through their parts", () => {
    const eggNoodles = {
      ingredients: [...recipe().ingredients, { name: "egg noodles", measurement: "" }],
    };
    expect(verify(eggNoodles, { diet: "Vegan" })).toEqual({ ok: false, reason: "diet" });
    expect(verify(eggNoodles, { diet: "Gluten-free" })).toEqual({ ok: false, reason: "diet" });
    const condensed = {
      ingredients: [...recipe().ingredients, { name: "condensed milk", measurement: "" }],
    };
    expect(verify(condensed, { exclusions: parseExclusions("no dairy") })).toEqual({
      ok: false,
      reason: "excluded",
    });
    const nuggets = {
      ingredients: [...recipe().ingredients, { name: "chicken nuggets", measurement: "" }],
    };
    expect(verify(nuggets, { diet: "Vegetarian" })).toEqual({ ok: false, reason: "diet" });
    const riceNoodles = {
      ingredients: [...recipe().ingredients, { name: "rice noodles", measurement: "" }],
    };
    expect(verify(riceNoodles, { diet: "Gluten-free" }).ok).toBe(true);
  });

  it("egg noodles are not a protein source", () => {
    const r = verify(
      {
        ingredients: [
          { name: "spinach", measurement: "" },
          { name: "egg noodles", measurement: "" },
        ],
        steps: ["Boil the egg noodles.", "Toss with the spinach."],
      },
      { highProtein: true },
    );
    expect(r).toEqual({ ok: false, reason: "not_high_protein" });
  });
});

// ---------------------------------------------------------------------------- 3. optional mentions

describe("optional / conditional ingredients still count for diet and exclusions", () => {
  it.each([
    ["Optional: crumble bacon on top.", { diet: "Vegetarian" as const }, "diet"],
    [
      "Top with grated cheddar if you like.",
      { exclusions: parseExclusions("no dairy") },
      "excluded",
    ],
    ["Drizzle with honey if desired.", { diet: "Vegan" as const }, "diet"],
    ["Optionally finish with a spoon of ghee.", { diet: "Vegan" as const }, "diet"],
    [
      "Add hot sauce for serving, if you like.",
      { exclusions: parseExclusions("no spicy food") },
      "excluded",
    ],
    [
      "Garnish with chopped peanuts, if using.",
      { exclusions: parseExclusions("nut-free") },
      "excluded",
    ],
    ["Add walnuts if desired.", { exclusions: parseExclusions("no nuts") }, "excluded"],
  ])("%s", (step, c, reason) => {
    expect(verify({ steps: ["Whisk the eggs.", "Wilt the spinach.", step] }, c)).toEqual({
      ok: false,
      reason,
    });
  });

  it("optional items still don't count as needed for availability", () => {
    const r = verify({
      steps: ["Whisk the eggs; add the spinach.", "Optional: top with cheddar."],
    });
    expect(r.ok && r.recipe.everythingOnHand).toBe(true);
  });

  it("harmless conditional prose and negated mentions are not rejected", () => {
    for (const step of [
      "If you like it softer, cook 1 more minute.",
      "Serve warm, optionally with a squeeze of lemon.",
      "Cook without butter to keep it light.",
      "Use oil instead of butter.",
    ]) {
      const vegan = verify(
        {
          ingredients: [{ name: "spinach", measurement: "" }],
          steps: ["Wilt the spinach.", step],
        },
        { diet: "Vegan", inventory: [item("spinach"), item("lemon"), item("oil")] },
      );
      expect(vegan.ok).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------- 4. vocabulary

describe("high-risk step-only ingredients are recognised", () => {
  it.each([
    ["Pour in the stock and simmer.", "stock"],
    ["Add the broth.", "broth"],
    ["Splash in the mirin.", "mirin"],
    ["Brush with hoisin.", "hoisin"],
    ["Melt the ghee.", "ghee"],
    ["Deglaze with beer.", "beer"],
    ["Crisp the lardons.", "lardon"],
    ["Add a dash of Worcestershire.", "worcestershire"],
    ["Add a dash of Worcestershire sauce.", "worcestershire sauce"],
  ])("%s → %s", (step, expected) => {
    expect(mentionedIngredients(step)).toContain(expected);
  });

  it("a step-only item the user doesn't have blocks the claim", () => {
    const r = verify({
      steps: ["Whisk the eggs.", "Wilt the spinach in the stock with a splash of mirin."],
    });
    expect(r.ok && r.recipe.everythingOnHand).toBe(false);
    expect(r.ok && r.recipe.missing).toEqual(["stock", "mirin"]);
  });

  it.each([
    ["Stir in the stock.", { diet: "Vegetarian" as const }, "diet"],
    ["Add a dash of Worcestershire.", { diet: "Vegetarian" as const }, "diet"],
    ["Add the lardons.", { diet: "Vegetarian" as const }, "diet"],
    ["Bloom the gelatin.", { diet: "Vegetarian" as const }, "diet"],
    ["Fry in lard.", { diet: "Vegetarian" as const }, "diet"],
    ["Finish with ghee.", { diet: "Vegan" as const }, "diet"],
    ["Deglaze with beer.", { diet: "Gluten-free" as const }, "diet"],
    ["Brush with hoisin.", { diet: "Gluten-free" as const }, "diet"],
    ["Finish with ghee.", { exclusions: parseExclusions("no dairy") }, "excluded"],
    ["Add the lardons.", { exclusions: parseExclusions("no pork") }, "excluded"],
    ["Add the guanciale.", { exclusions: parseExclusions("no pork") }, "excluded"],
    ["Deglaze with white wine.", { exclusions: parseExclusions("no alcohol") }, "excluded"],
    ["Add a splash of mirin.", { exclusions: parseExclusions("alcohol-free please") }, "excluded"],
    ["Deglaze with beer.", { exclusions: parseExclusions("no alcohol") }, "excluded"],
    ["Stir in some sriracha.", { exclusions: parseExclusions("no spicy food") }, "excluded"],
  ])("%s under %j → %s", (step, c, reason) => {
    expect(verify({ steps: ["Whisk the eggs.", "Wilt the spinach.", step] }, c)).toEqual({
      ok: false,
      reason,
    });
  });

  it("qualified vegetarian stock and vinegar are fine", () => {
    const veg = verify(
      {
        ingredients: [...recipe().ingredients, { name: "vegetable stock", measurement: "" }],
        steps: ["Whisk the eggs.", "Wilt the spinach in the stock."],
      },
      { diet: "Vegetarian", inventory: [...base.inventory, item("vegetable stock")] },
    );
    expect(veg.ok && veg.recipe.everythingOnHand).toBe(true);
    const vinegar = verify(
      {
        ingredients: [...recipe().ingredients, { name: "red wine vinegar", measurement: "" }],
      },
      {
        exclusions: parseExclusions("no alcohol"),
        inventory: [...base.inventory, item("red wine vinegar")],
      },
    );
    expect(vinegar.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------- 6. time

describe("time verification", () => {
  it.each([
    ["twenty-five minutes", [25]],
    ["Simmer for twenty five minutes.", [25]],
    ["Bake for forty minutes", [40]],
    ["Rest for about an hour.", [60]],
    ["Cook for eleven minutes", [11]],
  ])("parses %s", (step, expected) => {
    expect(stepDurations(step)).toEqual(expected);
  });

  const steps = (...s: string[]) => ({ prepMinutes: 5, cookMinutes: 10, steps: s });

  it("15-minute limit: steps adding up to 30 minutes are rejected", () => {
    expect(
      verify(
        steps("Whisk the eggs 5 minutes.", "Cook the spinach 10 minutes.", "Bake 15 minutes."),
        {
          maxMinutes: "15",
        },
      ),
    ).toEqual({ ok: false, reason: "time_contradiction" });
  });

  it("20-minute limit: 'twenty-five minutes' is rejected", () => {
    expect(
      checkTime(
        recipe({ prepMinutes: 5, cookMinutes: 10, steps: ["Simmer twenty-five minutes."] }),
        20,
      ),
    ).toEqual({
      ok: false,
      reason: "time_contradiction",
    });
    expect(
      verify(steps("Whisk the eggs.", "Simmer twenty-five minutes."), { maxMinutes: "15" }),
    ).toEqual({
      ok: false,
      reason: "time_contradiction",
    });
  });

  it("'overnight' and 'about an hour' exceed short limits", () => {
    expect(
      verify(steps("Soak the spinach overnight.", "Cook the eggs."), { maxMinutes: "45" }),
    ).toEqual({
      ok: false,
      reason: "time_contradiction",
    });
    expect(
      verify(steps("Whisk the eggs.", "Let it rest for about an hour."), { maxMinutes: "30" }),
    ).toEqual({
      ok: false,
      reason: "time_contradiction",
    });
  });

  it("multi-step durations that clearly exceed the limit are rejected", () => {
    expect(
      verify(
        steps(
          "Whisk the eggs 10 minutes.",
          "Cook the spinach 15 minutes.",
          "Bake 15 minutes.",
          "Rest 10 minutes.",
        ),
        { maxMinutes: "30" },
      ),
    ).toEqual({ ok: false, reason: "time_contradiction" });
  });

  it("ambiguous timing is not rejected", () => {
    // small overrun, parallel steps, vague durations
    const r1 = verify(
      steps("Whisk the eggs 10 minutes.", "Cook the spinach 12 minutes.", "Rest 10 minutes."),
      {
        maxMinutes: "30",
      },
    );
    expect(r1.ok).toBe(true);
    expect(r1.ok && r1.recipe.totalMinutesUpper).toBe(32);
    const r2 = verify(
      steps(
        "Boil the eggs 15 minutes.",
        "Meanwhile, cook the spinach 10 minutes.",
        "Rest 10 minutes.",
      ),
      { maxMinutes: "30" },
    );
    expect(r2.ok).toBe(true);
    const r3 = verify(steps("Whisk the eggs.", "Cook the spinach a few minutes until wilted."), {
      maxMinutes: "15",
    });
    expect(r3.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------- 7. generic words in exclusions

describe("generic words in exclusions", () => {
  const labels = (note: string) => parseExclusions(note).map((e) => e.label);
  it.each([
    ["no spicy food", ["spicy"]],
    ["no weird food", []],
    ["no weird stuff", []],
    ["no fancy dishes", []],
    ["no fried food", []],
    ["no pork dishes", ["pork"]],
    ["no dairy stuff please", ["dairy"]],
    ["no mushrooms", ["mushroom"]],
    ["no pork", ["pork"]],
    ["no dairy", ["dairy"]],
    ["no alcohol", ["alcohol"]],
  ])("%s → %j", (note, expected) => {
    expect(labels(note)).toEqual(expected);
  });

  it("'no spicy food' is enforced as a spicy exclusion", () => {
    const [ex] = parseExclusions("no spicy food");
    expect(ex?.group).toBe(true);
    expect(ex?.test(["hot", "sauce"])).toBe(true);
    expect(ex?.test(["jalapeno"])).toBe(true);
    expect(ex?.test(["spinach"])).toBe(false);
  });

  it("generic words never become literal step-text exclusions", () => {
    // before the fix "food" became a literal label that matched any step mentioning "food"
    const r = verify(
      { steps: ["Whisk the eggs.", "Wilt the spinach in a food processor."] },
      { exclusions: parseExclusions("no weird food") },
    );
    expect(r.ok).toBe(true);
  });
});

describe("short back-references in steps", () => {
  it("'the beans' after listing green beans is the same item, not a new one", () => {
    const r = verify(
      {
        ingredients: [...recipe().ingredients, { name: "green beans", measurement: "" }],
        steps: ["Whisk the eggs.", "Steam the beans, then wilt the spinach."],
      },
      { inventory: [...base.inventory, item("green beans")] },
    );
    expect(r.ok && r.recipe.everythingOnHand).toBe(true);
    expect(r.ok && r.recipe.ingredients.some((i) => i.fromSteps)).toBe(false);
  });
  it("a different product mentioned in the steps is still caught", () => {
    const r = verify(
      {
        ingredients: [...recipe().ingredients, { name: "green beans", measurement: "" }],
        steps: ["Whisk the eggs.", "Toss the green beans with potatoes."],
      },
      { inventory: [...base.inventory, item("green beans")] },
    );
    expect(r.ok && r.recipe.missing).toEqual(["potato"]);
  });
  it("regional meat names still match", () => {
    expect(covers("turkey mince", "ground turkey")).toBe(true);
    expect(covers("minced pork", "ground pork")).toBe(true);
  });
});

describe("plant-based products named in steps", () => {
  it("are recognised as one product, not their parts", () => {
    expect(mentionedIngredients("Warm the oat milk, then fold in the almond flour.")).toEqual([
      "oat milk",
      "almond flour",
    ]);
  });
});
