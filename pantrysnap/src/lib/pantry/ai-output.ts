// Parses and validates raw model output. Nothing from the model reaches the UI
// without passing through here. Individual bad items are dropped; a response with
// no usable structure is reported as invalid so the caller can retry once.
import { z } from "zod";
import { cleanText, LIMITS, type Ingredient } from "./schemas";

/** Extracts a JSON object from model text, tolerating code fences and surrounding prose. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const candidates = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) candidates.push(trimmed.slice(first, last + 1));
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next candidate
    }
  }
  return undefined;
}

const text = (max: number) =>
  z
    .string()
    .transform(cleanText)
    .pipe(z.string().min(1))
    .transform((s) => s.slice(0, max));

const optionalText = (max: number) =>
  z
    .union([z.string(), z.number()])
    .nullish()
    .transform((v) => (v == null ? "" : cleanText(String(v)).slice(0, max)));

// Accepts {name, quantity} objects or bare strings.
const detectedItemSchema = z.union([
  text(LIMITS.maxIngredientNameChars).transform((name) => ({ name, quantity: "" })),
  z.object({
    name: text(LIMITS.maxIngredientNameChars),
    quantity: optionalText(LIMITS.maxQuantityChars),
  }),
]);

export type ParseResult<T> = { ok: true; value: T } | { ok: false };

export function parseDetection(raw: string): ParseResult<Ingredient[]> {
  const json = extractJson(raw);
  const shape = z.object({ ingredients: z.array(z.unknown()) }).safeParse(json);
  if (!shape.success) return { ok: false };
  const seen = new Set<string>();
  const ingredients: Ingredient[] = [];
  for (const item of shape.data.ingredients) {
    const parsed = detectedItemSchema.safeParse(item);
    if (!parsed.success) continue;
    const key = parsed.data.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    // Everything the model reports is a guess until the user confirms it.
    ingredients.push({ ...parsed.data, confirmed: false });
    if (ingredients.length >= LIMITS.maxIngredients) break;
  }
  return { ok: true, value: ingredients };
}

const minutes = z.preprocess(
  (v) => (typeof v === "string" ? Number.parseInt(v, 10) : v),
  z
    .number()
    .int()
    .min(0)
    .max(24 * 60),
);

const rawRecipeSchema = z.object({
  name: text(80),
  description: optionalText(300),
  whyItFits: optionalText(160),
  // Missing or unparseable servings are kept as null ("not stated"), never guessed.
  servings: z.preprocess(
    (v) => (typeof v === "string" ? Number.parseInt(v, 10) : v),
    z.number().int().min(1).max(100).nullable().catch(null),
  ),
  prepMinutes: minutes,
  cookMinutes: minutes,
  ingredients: z
    .array(
      z.union([
        text(80).transform((name) => ({ name, measurement: "" })),
        z.object({ name: text(80), measurement: optionalText(60) }),
      ]),
    )
    .min(1)
    .max(30),
  steps: z.array(text(600)).min(1).max(30),
  substitutes: z
    .array(z.object({ from: text(80), to: text(80) }))
    .max(10)
    .catch([])
    .default([]),
});

export type RawRecipe = z.infer<typeof rawRecipeSchema>;

export function parseRecipes(raw: string): ParseResult<RawRecipe[]> {
  const json = extractJson(raw);
  const shape = z.object({ recipes: z.array(z.unknown()) }).safeParse(json);
  if (!shape.success) return { ok: false };
  const recipes: RawRecipe[] = [];
  for (const item of shape.data.recipes.slice(0, 10)) {
    const parsed = rawRecipeSchema.safeParse(item);
    if (parsed.success) recipes.push(parsed.data);
  }
  return { ok: true, value: recipes };
}
