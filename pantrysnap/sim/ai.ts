// Simulated recipe "model". It is deliberately LIST-FAITHFUL: it only builds recipes from the
// ingredient list it is given, exactly as the real prompt instructs. This isolates what the
// verifier can and cannot catch when the LIST ITSELF is wrong. It is not a model of real
// recipe quality.
import type { RawRecipe } from "../src/lib/pantry/ai-output";
import { isStaple, tokens } from "../src/lib/pantry/ingredients";
import { plainCount } from "../src/lib/pantry/recipe-validation";
import type { Ingredient } from "../src/lib/pantry/schemas";

/** Names a real model would plausibly refuse to cook with; the sim skips them too. */
const NON_FOOD = new Set([
  "white tub",
  "container",
  "dip",
  "sauce",
  "leftovers",
  "green sauce",
  "white block",
  "soup",
  "energy drinks",
  "coffee",
  "orange juice",
]);

function measure(i: Ingredient): string {
  const have = plainCount(i.quantity);
  if (have !== null) return String(Math.min(have, 6)); // trusts the listed amount
  return /oil|sauce|vinegar|syrup|paste|powder|spice|cumin|paprika|oregano|salt/.test(i.name)
    ? "1 tbsp"
    : "1 cup";
}

export function recipeFrom(
  name: string,
  items: Ingredient[],
  opts: {
    extraListed?: string[];
    stepOnly?: string;
    minutes?: [number, number];
    servings?: number | null;
  } = {},
): RawRecipe {
  const [prep, cook] = opts.minutes ?? [5, 12];
  const list = [
    ...items.map((i) => ({ name: i.name, measurement: measure(i) })),
    ...(opts.extraListed ?? []).map((n) => ({ name: n, measurement: "1" })),
  ];
  const named = list.map((i) => i.name);
  const steps = [
    `Prepare the ${named.slice(0, 2).join(" and ")}.`,
    `Cook ${named.slice(2).length ? `the ${named.slice(2).join(", ")} with the rest` : "everything together"} for ${cook - 2} minutes.`,
    opts.stepOnly
      ? `Finish with ${opts.stepOnly} and serve.`
      : "Season with salt and pepper and serve.",
  ];
  return {
    name,
    description: "",
    whyItFits: "",
    servings: opts.servings === undefined ? 2 : opts.servings,
    prepMinutes: prep,
    cookMinutes: cook,
    ingredients: list,
    steps,
    substitutes: [],
  };
}

/**
 * Three recipes per confirmed list:
 *  R1 — uses a "focus" item (the injected error, when there is one) plus two other list items
 *  R2 — uses the first three usable list items
 *  R3 — two list items plus one ingredient that is honestly not on the list
 */
export type SimRequest = { maxMinutes: number; servings: number };

/** Obeys the request like a compliant model: total time within the limit, stated servings = requested. */
export function simulateRecipes(
  list: Ingredient[],
  focus: string | null,
  req: SimRequest = { maxMinutes: 30, servings: 2 },
  /** A "smart" model writes the generic name for a brand/alias (e.g. Kerrygold → butter). */
  genericFor: { alias: string; generic: string } | null = null,
): RawRecipe[] {
  const minutes: [number, number] = [
    Math.min(5, Math.floor(req.maxMinutes / 3)),
    Math.min(12, req.maxMinutes - Math.min(5, Math.floor(req.maxMinutes / 3))),
  ];
  const opts = { minutes, servings: req.servings };
  const usable = list.filter(
    (i) => !NON_FOOD.has(i.name.toLowerCase()) && !isStaple(i.name) && tokens(i.name).length > 0,
  );
  if (!usable.length) return [];
  const out: RawRecipe[] = [];
  const focusItem = focus
    ? usable.find((i) => i.name.toLowerCase() === focus.toLowerCase())
    : undefined;
  if (focusItem) {
    const others = usable.filter((i) => i !== focusItem).slice(0, 2);
    out.push(recipeFrom(`Skillet with ${focusItem.name}`, [focusItem, ...others], opts));
    if (genericFor && genericFor.alias.toLowerCase() === focusItem.name.toLowerCase()) {
      out.push(
        recipeFrom(
          `Classic ${genericFor.generic}`,
          [{ name: genericFor.generic, quantity: focusItem.quantity }, ...others],
          opts,
        ),
      );
    }
  }
  out.push(recipeFrom(`Quick ${usable[0]!.name} bowl`, usable.slice(0, 3), opts));
  const missing = ["shallot", "heavy cream", "fresh basil"].find(
    (m) => !usable.some((u) => u.name.toLowerCase().includes(m.split(" ")[0]!)),
  )!;
  out.push(
    recipeFrom(`${usable[usable.length - 1]!.name} bake`, usable.slice(-2), {
      ...opts,
      extraListed: [missing],
    }),
  );
  return out;
}
