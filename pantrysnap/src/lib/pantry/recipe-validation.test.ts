import { describe, expect, it } from "vitest";
import type { RawRecipe } from "./ai-output";
import { covers, isStaple, validateRecipes, violatesDiet } from "./recipe-validation";

describe("covers", () => {
  it.each([
    ["eggs", "egg", true],
    ["eggs", "2 large eggs, beaten", true],
    ["eggs", "egg yolks", true],
    ["cheddar", "cheddar cheese", true],
    ["cheddar cheese", "cheese", true],
    ["chicken thighs", "chicken", true],
    ["olive oil", "oil", true],
    ["oil", "olive oil", true],
    ["lemon", "lemon juice", true],
    ["garlic", "garlic cloves, minced", true],
    ["spinach", "baby spinach", true],
    ["milk", "coconut milk", false],
    ["coconut milk", "milk", false],
    ["tomatoes", "tomato paste", false],
    ["tomato paste", "tomatoes", false],
    ["garlic powder", "garlic", false],
    ["cream", "heavy cream", false],
    ["cream", "sour cream", false],
    ["chicken stock", "chicken", false],
    ["eggs", "eggplant", false],
    ["butter", "butternut squash", false],
  ])("%s covers %s → %s", (inventory, recipe, expected) => {
    expect(covers(inventory, recipe)).toBe(expected);
  });
});

describe("isStaple", () => {
  it("only treats salt, pepper and water as staples", () => {
    expect(isStaple("salt")).toBe(true);
    expect(isStaple("Salt and pepper, to taste")).toBe(true);
    expect(isStaple("freshly ground black pepper")).toBe(true);
    expect(isStaple("bell pepper")).toBe(false);
    expect(isStaple("red pepper flakes")).toBe(false);
    expect(isStaple("olive oil")).toBe(false);
  });
});

describe("violatesDiet", () => {
  it.each([
    ["chicken breast", "Vegetarian", true],
    ["fish sauce", "Vegetarian", true],
    ["Worcestershire sauce", "Vegetarian", true],
    ["vegetable stock", "Vegetarian", false],
    ["eggs", "Vegetarian", false],
    ["eggs", "Vegan", true],
    ["butter", "Vegan", true],
    ["peanut butter", "Vegan", false],
    ["almond milk", "Vegan", false],
    ["eggplant", "Vegan", false],
    ["honey", "Vegan", true],
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

const recipe = (over: Partial<RawRecipe>): RawRecipe => ({
  name: "Spinach omelette",
  description: "",
  prepMinutes: 5,
  cookMinutes: 10,
  ingredients: [
    { name: "eggs", measurement: "4" },
    { name: "spinach", measurement: "1 cup" },
    { name: "salt", measurement: "pinch" },
  ],
  steps: ["Whisk", "Cook"],
  substitutes: [],
  ...over,
});

const base = {
  inventory: [
    { name: "eggs", quantity: "6" },
    { name: "spinach", quantity: "" },
    { name: "cheddar", quantity: "" },
    { name: "milk", quantity: "" },
  ],
  servings: 2,
  maxMinutes: "30" as const,
  diet: "None" as const,
};

describe("validateRecipes", () => {
  it("computes have/missing itself instead of trusting the model", () => {
    const { recipes } = validateRecipes(
      [
        recipe({
          ingredients: [
            { name: "eggs", measurement: "4" },
            { name: "heavy cream", measurement: "1/4 cup" },
            { name: "shallot", measurement: "1" },
            { name: "salt", measurement: "" },
          ],
        }),
      ],
      base,
    );
    expect(recipes[0]).toMatchObject({
      missing: ["heavy cream", "shallot"],
      matchPercent: 33,
      servings: 2,
      totalMinutes: 15,
    });
    expect(recipes[0]?.ingredients.map((i) => i.status)).toEqual([
      "have",
      "missing",
      "missing",
      "staple",
    ]);
  });

  it("rejects recipes over the time limit, diet violations, duplicates, and too many missing", () => {
    const { recipes, rejected } = validateRecipes(
      [
        recipe({}),
        recipe({ name: "Spinach Omelette" }),
        recipe({ name: "Slow", cookMinutes: 90 }),
        recipe({
          name: "Bacon eggs",
          ingredients: [
            { name: "bacon", measurement: "" },
            { name: "eggs", measurement: "" },
          ],
        }),
        recipe({
          name: "Shopping list",
          ingredients: ["eggs", "a", "b", "c", "d"].map((name) => ({ name, measurement: "" })),
        }),
        recipe({ name: "Nothing here", ingredients: [{ name: "saffron", measurement: "" }] }),
      ],
      { ...base, diet: "Vegetarian" },
    );
    expect(recipes.map((r) => r.name)).toEqual(["Spinach omelette"]);
    expect(rejected.map((r) => r.reason)).toEqual([
      "duplicate",
      "time",
      "diet",
      "too_many_missing",
      "nothing_on_hand",
    ]);
  });

  it("never reports more than 100% on hand and caps results", () => {
    const many = Array.from({ length: 8 }, (_, i) => recipe({ name: `R${i}` }));
    const { recipes } = validateRecipes(many, base);
    expect(recipes).toHaveLength(4);
    expect(recipes.every((r) => r.matchPercent === 100 && r.missing.length === 0)).toBe(true);
  });

  it("allows long recipes only for 60+ and still caps absurd ones", () => {
    const long = recipe({ cookMinutes: 115 });
    expect(validateRecipes([long], { ...base, maxMinutes: "60+" }).recipes).toHaveLength(1);
    expect(
      validateRecipes([recipe({ cookMinutes: 600 })], { ...base, maxMinutes: "60+" }).recipes,
    ).toHaveLength(0);
  });

  it("keeps only substitutes that swap a missing item for something on hand", () => {
    const { recipes } = validateRecipes(
      [
        recipe({
          ingredients: [
            { name: "eggs", measurement: "" },
            { name: "heavy cream", measurement: "" },
          ],
          substitutes: [
            { from: "heavy cream", to: "milk" },
            { from: "heavy cream", to: "creme fraiche" },
            { from: "eggs", to: "milk" },
          ],
        }),
      ],
      base,
    );
    expect(recipes[0]?.substitutes).toEqual([{ from: "heavy cream", to: "milk" }]);
  });
});
