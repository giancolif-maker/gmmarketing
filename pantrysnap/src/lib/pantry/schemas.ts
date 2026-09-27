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
} as const;

export const TIME_OPTIONS = ["15", "30", "45", "60+"] as const;
export const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
export const DIETS = ["None", "Vegetarian", "Vegan", "Gluten-free"] as const;

export type TimeOption = (typeof TIME_OPTIONS)[number];
export type MealType = (typeof MEAL_TYPES)[number];
export type Diet = (typeof DIETS)[number];

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

export const recipesRequestSchema = z
  .object({
    scanId: z.string().uuid(),
    ingredients: z.array(ingredientSchema).min(1).max(LIMITS.maxIngredients),
    servings: z.number().int().min(LIMITS.minServings).max(LIMITS.maxServings),
    maxMinutes: z.enum(TIME_OPTIONS),
    mealType: z.enum(MEAL_TYPES),
    diet: z.enum(DIETS),
  })
  .strict();

export type DetectRequest = z.infer<typeof detectRequestSchema>;
export type RecipesRequest = z.infer<typeof recipesRequestSchema>;

export type Usage = {
  isPro: boolean;
  scansUsed: number;
  scanLimit: number;
  resetsAt: string;
};

export type RecipeIngredient = {
  name: string;
  measurement: string;
  /** Computed on the server against the confirmed ingredient list — never taken from the AI. */
  status: "have" | "staple" | "missing";
};

export type Recipe = {
  id: string;
  name: string;
  description: string;
  prepMinutes: number;
  cookMinutes: number;
  totalMinutes: number;
  servings: number;
  /** Share of non-staple ingredients the user already has (0–100), computed on the server. */
  matchPercent: number;
  missing: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
  substitutes: Array<{ from: string; to: string }>;
};

export type DetectResult =
  { ok: true; scanId: string; ingredients: Ingredient[]; usage: Usage } | Failure;
export type RecipesResult = { ok: true; recipes: Recipe[] } | Failure;
export type AccountResult = { ok: true; usage: Usage } | Failure;
