import { describe, expect, it } from "vitest";
import {
  covers,
  ingredientKey,
  isStaple,
  mentionedIngredients,
  normalizeIngredients,
  parseTypedIngredients,
  sameIngredient,
} from "./ingredients";

describe("equivalent names match", () => {
  it.each([
    ["tomato", "tomatoes"],
    ["eggs", "egg"],
    ["green onion", "scallions"],
    ["spring onions", "green onion"],
    ["cilantro", "coriander"],
    ["fresh coriander leaves", "cilantro"],
    ["bell pepper", "peppers"],
    ["red peppers", "bell pepper"],
    ["capsicum", "bell peppers"],
    ["cheddar", "cheddar cheese"],
    ["chicken breast", "chicken"],
    ["chicken", "chicken breasts"],
    ["courgette", "zucchini"],
    ["aubergine", "eggplant"],
    ["garbanzo beans", "chickpeas"],
    ["prawns", "shrimp"],
    ["double cream", "heavy cream"],
    ["yoghurt", "yogurt"],
    ["jalapeño", "jalapeno"],
    ["mozzarella", "cheese"],
    ["spaghetti", "pasta"],
    ["olive oil", "oil"],
    ["oil", "vegetable oil"],
    ["lemon", "lemon juice"],
    ["garlic", "3 garlic cloves, minced"],
    ["spinach", "baby spinach"],
  ])("%s ≈ %s", (a, b) => {
    expect(covers(a, b)).toBe(true);
  });
});

describe("different products never match", () => {
  it.each([
    ["milk", "coconut milk"],
    ["coconut milk", "milk"],
    ["butter", "peanut butter"],
    ["peanut butter", "butter"],
    ["chicken", "chicken broth"],
    ["chicken broth", "chicken"],
    ["chicken stock", "chicken"],
    ["cream", "ice cream"],
    ["ice cream", "cream"],
    ["cream", "sour cream"],
    ["cream cheese", "cheese"],
    ["tomatoes", "tomato paste"],
    ["tomato paste", "tomatoes"],
    ["garlic powder", "garlic"],
    ["eggs", "eggplant"],
    ["butter", "butternut squash"],
    ["cilantro", "ground coriander"],
    ["chili", "chili powder"],
    ["pepper", "bell pepper"],
    ["jalapeno peppers", "bell pepper"],
    ["rice", "rice vinegar"],
    ["almonds", "almond milk"],
    ["coconut", "coconut oil"],
  ])("%s ≠ %s", (inventory, recipe) => {
    expect(covers(inventory, recipe)).toBe(false);
  });
});

describe("staples and keys", () => {
  it("treats only salt, pepper and water as staples", () => {
    expect(isStaple("Salt and pepper, to taste")).toBe(true);
    expect(isStaple("freshly ground black pepper")).toBe(true);
    expect(isStaple("bell pepper")).toBe(false);
    expect(isStaple("peppers")).toBe(false);
    expect(isStaple("red pepper flakes")).toBe(false);
  });
  it("gives synonyms the same de-duplication key", () => {
    expect(ingredientKey("Scallions")).toBe(ingredientKey("green onion"));
    expect(ingredientKey("Tomatoes")).toBe(ingredientKey("tomato"));
    expect(ingredientKey("milk")).not.toBe(ingredientKey("coconut milk"));
  });
});

describe("normalizeIngredients (shared by scan, typed and edits)", () => {
  it("lowercases, trims, de-duplicates by meaning, drops junk", () => {
    expect(
      normalizeIngredients([
        { name: "  Scallions ", quantity: "1 bunch" },
        { name: "green onion" },
        { name: "Eggs." },
        { name: "12345" },
        { name: "" },
        { name: "x".repeat(200) },
      ]),
    ).toEqual([
      { name: "scallions", quantity: "1 bunch", confirmed: true },
      { name: "eggs", quantity: "", confirmed: true },
    ]);
  });
});

describe("parseTypedIngredients", () => {
  it("accepts one per line", () => {
    expect(
      parseTypedIngredients("chicken\nrice\neggs\ncheddar cheese\nspinach").map((i) => i.name),
    ).toEqual(["chicken", "rice", "eggs", "cheddar cheese", "spinach"]);
  });
  it("accepts commas, semicolons, bullets and numbering", () => {
    expect(
      parseTypedIngredients("- chicken, rice; • eggs\n1. spinach\n2) feta").map((i) => i.name),
    ).toEqual(["chicken", "rice", "eggs", "spinach", "feta"]);
  });
  it("extracts simple quantities", () => {
    expect(
      parseTypedIngredients(
        "6 eggs\n2 cans of chickpeas\nmilk (1 litre)\nlemons x3\na red onion\n1/2 cabbage",
      ),
    ).toEqual([
      { name: "eggs", quantity: "6", confirmed: true },
      { name: "chickpeas", quantity: "2 cans", confirmed: true },
      { name: "milk", quantity: "1 litre", confirmed: true },
      { name: "lemons", quantity: "3", confirmed: true },
      { name: "red onion", quantity: "", confirmed: true },
      { name: "cabbage", quantity: "1/2", confirmed: true },
    ]);
  });
  it("de-duplicates and ignores empties", () => {
    expect(
      parseTypedIngredients("eggs, Eggs, , egg\n\n\ntomatoes, tomato").map((i) => i.name),
    ).toEqual(["eggs", "tomatoes"]);
  });
  it("returns nothing for input without ingredients", () => {
    expect(parseTypedIngredients("   \n , ; 123")).toEqual([]);
  });
  it("caps the list", () => {
    const many = Array.from(
      { length: 100 },
      (_, i) => `item${String.fromCharCode(97 + (i % 26))}${i}`,
    ).join("\n");
    expect(parseTypedIngredients(many).length).toBeLessThanOrEqual(60);
  });
});

describe("mentionedIngredients (step scanning)", () => {
  it("finds ingredients in free text, preferring multi-word names", () => {
    expect(
      mentionedIngredients("Drizzle with sesame oil and soy sauce, then top with green onions."),
    ).toEqual(["sesame oil", "soy sauce", "green onion"]);
  });
  it("singularizes and ignores non-ingredients", () => {
    expect(mentionedIngredients("Whisk the eggs in a large bowl until fluffy.")).toEqual(["egg"]);
    expect(mentionedIngredients("Preheat the oven and grease the pan.")).toEqual([]);
  });
  it("does not confuse compound words", () => {
    expect(mentionedIngredients("Roast the eggplant and butternut squash.")).toEqual([
      "eggplant",
      "squash",
    ]);
    expect(mentionedIngredients("Bring the water to a boil.")).toEqual([]);
  });
  it("skips dish words that are the recipe's own name", () => {
    expect(mentionedIngredients("Simmer the chili for 20 minutes.", "Turkey Chili")).toEqual([]);
    expect(mentionedIngredients("Add the chili and garlic.", "Garlic noodles")).toEqual([
      "chili",
      "garlic",
    ]);
  });
  it("uses the same synonyms", () => {
    expect(mentionedIngredients("Scatter over coriander and scallions")).toEqual([
      "cilantro",
      "green onion",
    ]);
    expect(sameIngredient("green onion", "scallion")).toBe(true);
  });
});
