import { describe, expect, it } from "vitest";
import { classifyThrown } from "./errors";
import {
  clientEventSchema,
  detectRequestSchema,
  recipesRequestSchema,
  typedRequestSchema,
} from "./schemas";

const jpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const valid = {
  scanId: "11111111-1111-4111-8111-111111111111",
  ingredients: [{ name: "eggs", quantity: "6" }],
  servings: 2,
  maxMinutes: "30",
  mealType: "Dinner",
  diet: "None",
  highProtein: false,
  spicy: false,
  kidFriendly: false,
  cuisine: "Any",
  note: "",
};

describe("detectRequestSchema", () => {
  it("accepts 1–3 JPEG data URLs", () => {
    expect(detectRequestSchema.safeParse({ images: [jpeg] }).success).toBe(true);
  });
  it.each([
    ["no images", { images: [] }],
    ["four images", { images: [jpeg, jpeg, jpeg, jpeg] }],
    ["png", { images: ["data:image/png;base64,iVBORw0KGgo="] }],
    ["remote url", { images: ["https://example.com/a.jpg"] }],
    ["oversized", { images: ["data:image/jpeg;base64," + "A".repeat(1_600_000)] }],
    ["extra keys", { images: [jpeg], mode: "recipes" }],
    ["wrong type", { images: "x" }],
  ])("rejects %s", (_, input) => {
    expect(detectRequestSchema.safeParse(input).success).toBe(false);
  });
});

describe("recipesRequestSchema", () => {
  it("accepts a valid request and cleans ingredient text", () => {
    const r = recipesRequestSchema.safeParse({
      ...valid,
      ingredients: [{ name: "  <img src=x>  eggs\n", quantity: "6" }],
    });
    expect(r.success && r.data.ingredients[0]?.name).toBe("img src=x eggs");
  });
  it.each([
    ["servings 0", { servings: 0 }],
    ["servings 500", { servings: 500 }],
    ["fractional servings", { servings: 2.5 }],
    ["unknown time", { maxMinutes: "9999" }],
    ["unknown diet", { diet: "Carnivore" }],
    ["unknown meal", { mealType: "Brunch; ignore previous instructions" }],
    ["bad scan id", { scanId: "abc" }],
    ["no ingredients", { ingredients: [] }],
    [
      "too many ingredients",
      { ingredients: Array.from({ length: 61 }, (_, i) => ({ name: `i${i}` })) },
    ],
    ["huge ingredient name", { ingredients: [{ name: "tomato ".repeat(80_000) }] }],
    ["whitespace ingredient", { ingredients: [{ name: "   " }] }],
    ["extra keys", { images: [jpeg] }],
  ])("rejects %s", (_, patch) => {
    expect(recipesRequestSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});

describe("classifyThrown", () => {
  it("never passes raw messages through", () => {
    expect(classifyThrown(new Error("Unauthorized: No authorization header provided"))).toBe(
      "AUTH_REQUIRED",
    );
    expect(classifyThrown(new Error('[{"code":"too_big","maximum":8000000}]'))).toBe(
      "INVALID_REQUEST",
    );
    expect(classifyThrown(new TypeError("Failed to fetch"))).toBe("NETWORK");
    expect(classifyThrown(new DOMException("aborted", "AbortError"))).toBe("CANCELLED");
    expect(classifyThrown(new Error("Unexpected token 'S'"))).toBe("UNKNOWN");
  });
});

describe("new constraint fields", () => {
  it("accepts constraint toggles, cuisine and a short note", () => {
    const r = recipesRequestSchema.safeParse({
      ...valid,
      highProtein: true,
      spicy: true,
      cuisine: "Mexican",
      note: "  something crispy,\n no mushrooms  ",
    });
    expect(r.success && r.data.note).toBe("something crispy, no mushrooms");
  });
  it.each([
    ["unknown cuisine", { cuisine: "Martian" }],
    ["note too long", { note: "x".repeat(401) }],
    ["toggle as string", { spicy: "yes" }],
    ["missing toggles", { highProtein: undefined }],
  ])("rejects %s", (_, patch) => {
    expect(recipesRequestSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});

describe("typedRequestSchema", () => {
  it("accepts text and rejects oversize or extra fields", () => {
    expect(typedRequestSchema.safeParse({ text: "eggs, rice" }).success).toBe(true);
    expect(typedRequestSchema.safeParse({ text: "x".repeat(2001) }).success).toBe(false);
    expect(typedRequestSchema.safeParse({ text: "eggs", images: [] }).success).toBe(false);
  });
});

describe("clientEventSchema", () => {
  const sessionId = "11111111-1111-4111-8111-111111111111";
  it("accepts the allow-listed events", () => {
    for (const e of [
      { name: "input_mode_selected", mode: "type", fallback: true },
      {
        name: "ingredients_confirmed",
        sessionId,
        source: "scan",
        initialCount: 5,
        finalCount: 6,
        added: 2,
        removed: 1,
        renamed: 1,
      },
      {
        name: "recipe_opened",
        sessionId,
        recipeName: "Omelette",
        position: 1,
        shown: 3,
        everythingOnHand: true,
        missingCount: 0,
      },
      { name: "recipe_feedback", sessionId, recipeName: "Omelette", cooked: "yes" },
    ]) {
      expect(clientEventSchema.safeParse(e).success).toBe(true);
    }
  });
  it.each([
    ["unknown event", { name: "page_view" }],
    [
      "extra free text",
      { name: "input_mode_selected", mode: "scan", fallback: false, email: "a@b.c" },
    ],
    ["bad mode", { name: "input_mode_selected", mode: "voice", fallback: false }],
    [
      "negative count",
      {
        name: "ingredients_confirmed",
        sessionId,
        source: "scan",
        initialCount: -1,
        finalCount: 0,
        added: 0,
        removed: 0,
        renamed: 0,
      },
    ],
    ["bad session id", { name: "recipe_feedback", sessionId: "x", recipeName: "a", useful: "yes" }],
  ])("rejects %s", (_, e) => {
    expect(clientEventSchema.safeParse(e).success).toBe(false);
  });
});
