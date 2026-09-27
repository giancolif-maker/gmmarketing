// Request schemas and result types shared by client and server.
// Everything a client sends is validated against these on the server.
import { z } from "zod";
import type { Failure } from "./errors";

export const LIMITS = {
  maxImages: 3,
  /** Max base64 data-URL length per image after client preprocessing (~1.1 MB of JPEG). */
  maxImageDataUrlChars: 1_500_000,
  /** Hard cap for any server-function request body (enforced in src/start.ts). */
  maxRequestBytes: 5_000_000,
  maxIngredients: 60,
  maxIngredientNameChars: 60,
  maxQuantityChars: 40,
  minServings: 1,
  maxServings: 10,
  maxTypedChars: 2000,
  maxNoteChars: 200,
} as const;

export const TIME_OPTIONS = ["15", "30", "45", "60+"] as const;
export const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
export const DIETS = ["None", "Vegetarian", "Vegan", "Gluten-free"] as const;
export const CUISINES = [
  "Any",
  "American",
  "Italian",
  "Mexican",
  "Asian",
  "Indian",
  "Mediterranean",
] as const;

export type TimeOption = (typeof TIME_OPTIONS)[number];
export type MealType = (typeof MEAL_TYPES)[number];
export type Diet = (typeof DIETS)[number];
export type Cuisine = (typeof CUISINES)[number];

/** Upper bound on total minutes for each time option. "60+" still rejects absurd values. */
export const TIME_LIMIT_MINUTES: Record<TimeOption, number> = {
  "15": 15,
  "30": 30,
  "45": 45,
  "60+": 240,
};

/** Removes control characters and prompt-structure characters, collapses whitespace. */
export function cleanText(value: string): string {
  return (
    value
      // eslint-disable-next-line no-control-regex -- stripping control characters is the point
      .replace(/[\u0000-\u001f\u007f`{}<>[\]\\]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

const ingredientName = z
  .string()
  .max(LIMITS.maxIngredientNameChars * 2)
  .transform(cleanText)
  .pipe(z.string().min(1).max(LIMITS.maxIngredientNameChars));

export const ingredientSchema = z
  .object({
    name: ingredientName,
    quantity: z
      .string()
      .max(LIMITS.maxQuantityChars * 2)
      .transform(cleanText)
      .pipe(z.string().max(LIMITS.maxQuantityChars))
      .default(""),
    /**
     * False for items that came from a photo and the user hasn't confirmed yet. Only
     * confirmed items can support "everything on hand". Defaults to true (typed/edited).
     */
    confirmed: z.boolean().default(true),
  })
  .strict();

export type Ingredient = z.infer<typeof ingredientSchema>;

export const detectRequestSchema = z
  .object({
    images: z
      .array(
        z
          .string()
          .max(LIMITS.maxImageDataUrlChars)
          .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/),
      )
      .min(1)
      .max(LIMITS.maxImages),
  })
  .strict();

export const typedRequestSchema = z.object({ text: z.string().max(LIMITS.maxTypedChars) }).strict();

export const recipesRequestSchema = z
  .object({
    /** Id of the scan or typed session this request belongs to. */
    scanId: z.string().uuid(),
    ingredients: z.array(ingredientSchema).min(1).max(LIMITS.maxIngredients),
    servings: z.number().int().min(LIMITS.minServings).max(LIMITS.maxServings),
    maxMinutes: z.enum(TIME_OPTIONS),
    mealType: z.enum(MEAL_TYPES),
    diet: z.enum(DIETS),
    highProtein: z.boolean(),
    spicy: z.boolean(),
    kidFriendly: z.boolean(),
    cuisine: z.enum(CUISINES),
    note: z
      .string()
      .max(LIMITS.maxNoteChars * 2)
      .transform(cleanText)
      .pipe(z.string().max(LIMITS.maxNoteChars)),
  })
  .strict();

export type DetectRequest = z.infer<typeof detectRequestSchema>;
export type TypedRequest = z.infer<typeof typedRequestSchema>;
export type RecipesRequest = z.infer<typeof recipesRequestSchema>;

// ---------------------------------------------------------------------------- analytics

const shortText = z.string().max(80).transform(cleanText);
const count = z.number().int().min(0).max(1000);

/** Client-reported validation events. Names and fields are allow-listed; no free text beyond a recipe name. */
export const clientEventSchema = z.discriminatedUnion("name", [
  z
    .object({
      name: z.literal("input_mode_selected"),
      mode: z.enum(["scan", "type"]),
      fallback: z.boolean(),
    })
    .strict(),
  z
    .object({
      name: z.literal("ingredients_confirmed"),
      sessionId: z.string().uuid(),
      source: z.enum(["scan", "type"]),
      initialCount: count,
      finalCount: count,
      added: count,
      removed: count,
      renamed: count,
      /** Scanned items still unconfirmed when the user moved on. */
      unconfirmed: count.optional(),
    })
    .strict(),
  z
    .object({
      name: z.literal("recipe_opened"),
      sessionId: z.string().uuid(),
      recipeName: shortText,
      position: count,
      shown: count,
      everythingOnHand: z.boolean(),
      missingCount: count,
    })
    .strict(),
  z
    .object({
      name: z.literal("recipe_feedback"),
      sessionId: z.string().uuid(),
      recipeName: shortText,
      cooked: z.enum(["yes", "not_yet"]).optional(),
      useful: z.enum(["yes", "no"]).optional(),
    })
    .strict(),
]);

export type ClientEvent = z.input<typeof clientEventSchema>;

// ---------------------------------------------------------------------------- results

export type Usage = {
  isPro: boolean;
  isAnonymous: boolean;
  scansUsed: number;
  scanLimit: number;
  resetsAt: string | null;
};

export type RecipeIngredient = {
  name: string;
  measurement: string;
  /**
   * Computed on the server against the user's list — never taken from the AI.
   * "unconfirmed": only a scanned item the user hasn't confirmed matches it.
   */
  status: "have" | "staple" | "missing" | "unconfirmed";
  /** Mentioned only in the steps, not in the AI's ingredient list. */
  fromSteps: boolean;
  /** Both amounts are plain counts and the recipe needs more than the user listed. */
  short: { need: number; have: number } | null;
};

export type Recipe = {
  id: string;
  name: string;
  description: string;
  /** The AI's own one-line reason. Shown as its explanation, never as a verified claim. */
  whyItFits: string;
  prepMinutes: number;
  cookMinutes: number;
  /** Lower bound: max(stated prep+cook, longest single step duration). */
  totalMinutes: number;
  /** Set when step durations add up to noticeably more than the stated time. */
  totalMinutesUpper: number | null;
  servings: number;
  /** True when the AI stated the serving count and nothing in the text contradicts it. */
  servingsStated: boolean;
  /** Share of non-staple ingredients on the user's confirmed list (0–100), computed on the server. */
  matchPercent: number;
  /**
   * True only when every ingredient is on the user's CONFIRMED list, nothing is missing and
   * no amount is known to be short. Shown as "Everything on your confirmed list".
   */
  everythingOnHand: boolean;
  missing: string[];
  /** Ingredients matched only by scanned items the user hasn't confirmed. */
  unconfirmed: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
  substitutes: Array<{ from: string; to: string }>;
  /** Short facts verified by code, e.g. "Vegetarian (checked)", "Protein: chicken, eggs". */
  checks: string[];
};

export type SessionResult =
  | {
      ok: true;
      scanId: string;
      ingredients: Ingredient[];
      /** Null if the usage summary couldn't be read; the session itself still succeeded. */
      usage: Usage | null;
    }
  | Failure;
export type DetectResult = SessionResult;
export type RecipesResult = { ok: true; recipes: Recipe[]; excluded: string[] } | Failure;
export type AccountResult = { ok: true; usage: Usage } | Failure;
