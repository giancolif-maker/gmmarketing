// Deterministic checks applied to every AI recipe. The model's own claims about
// what the user has, match percentages, or diet compliance are never trusted:
// availability and constraints are recomputed here against the confirmed list.
//
// Matching is intentionally conservative: when unsure, an ingredient is reported
// as missing rather than on hand.
import type { RawRecipe } from "./ai-output";
import {
  TIME_LIMIT_MINUTES,
  type Diet,
  type Ingredient,
  type Recipe,
  type RecipeIngredient,
  type TimeOption,
} from "./schemas";

/** Assumed to be in every kitchen. Shown to the user as "pantry staple". */
const STAPLES = [["water"], ["salt"], ["pepper"], ["black", "pepper"], ["salt", "pepper"], ["ice"]];

/** Preparation / size / form words that don't change what the ingredient is. */
const DESCRIPTORS = new Set(
  (
    "fresh freshly chopped diced minced sliced grated shredded crushed large small medium " +
    "boneless skinless ripe cooked uncooked raw beaten softened melted finely roughly thinly " +
    "thick whole organic extra virgin optional taste of and or for a an the to into in plus " +
    "cup cups tbsp tsp tablespoon tablespoons teaspoon teaspoons g kg oz lb lbs ml l pinch " +
    "handful piece pieces can cans canned frozen dried dry ground leftover cold warm room " +
    "temperature unsalted salted plain peeled halved quartered cubed trimmed rinsed drained " +
    "packed about approx approximately few some more serve serving garnish baby young mini"
  ).split(" "),
);

/** Words that turn an ingredient into a different product ("coconut milk" ≠ "milk"). */
const TRANSFORMERS = new Set(
  (
    "coconut almond oat soy rice peanut cashew ice sour powder paste sauce stock broth " +
    "extract essence flavored flavoured syrup vinegar jam jelly chip chips cracker crackers " +
    "cake bread pudding soup seasoning mix"
  ).split(" "),
);

/** Extra words a more specific recipe item may add ("eggs" cover "egg yolks", "oil" covers "olive oil"). */
const PART_WORDS = new Set(
  (
    "cheese yolk white leaf leave clove breast thigh drumstick wing fillet filet zest juice " +
    "stalk sprig floret wedge slice head bulb kernel " +
    // generic "oil" covers everyday cooking oils
    "olive vegetable canola cooking neutral sunflower rapeseed"
  ).split(" "),
);

function singular(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (/(ches|shes|xes|sses)$/.test(word)) return word.slice(0, -2);
  const irregular: Record<string, string> = { leaves: "leaf", halves: "half", loaves: "loaf" };
  if (irregular[word]) return irregular[word];
  if (word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us")) return word.slice(0, -1);
  return word;
}

export function tokens(name: string): string[] {
  const words = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(singular)
    .filter((w) => !DESCRIPTORS.has(w));
  return [...new Set(words)];
}

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((t) => b.includes(t));
const subset = (a: string[], b: string[]) => a.length > 0 && a.every((t) => b.includes(t));

export function isStaple(name: string): boolean {
  const t = tokens(name);
  return t.length > 0 && STAPLES.some((s) => sameSet(s, t));
}

/** Does an inventory item satisfy a recipe ingredient? */
export function covers(inventoryName: string, recipeName: string): boolean {
  const inv = tokens(inventoryName);
  const rec = tokens(recipeName);
  if (!inv.length || !rec.length) return false;
  if (sameSet(inv, rec)) return true;
  // Inventory is more specific ("cheddar cheese" covers "cheese") unless the extra
  // words make it a different product ("coconut milk" does not cover "milk").
  if (subset(rec, inv))
    return inv.filter((t) => !rec.includes(t)).every((t) => !TRANSFORMERS.has(t));
  // Recipe is more specific only by a part word ("eggs" cover "egg yolks", "lemon" covers "lemon juice").
  if (subset(inv, rec)) return rec.filter((t) => !inv.includes(t)).every((t) => PART_WORDS.has(t));
  return false;
}

// ---------------------------------------------------------------------------- diet

const MEAT_FISH = new Set(
  (
    "beef pork chicken turkey lamb mutton goat bacon ham sausage salami pepperoni prosciutto " +
    "pancetta chorizo steak veal duck goose venison meat mince meatball fish salmon tuna cod " +
    "tilapia halibut trout sardine anchovy mackerel haddock shrimp prawn crab lobster clam " +
    "mussel oyster scallop squid calamari octopus gelatin lard worcestershire hotdog"
  ).split(" "),
);
const ANIMAL_PRODUCTS = new Set(
  (
    "egg milk butter cheese cream yogurt yoghurt honey ghee mayonnaise mayo whey casein " +
    "parmesan mozzarella cheddar feta ricotta buttermilk custard brie gouda halloumi paneer"
  ).split(" "),
);
const PLANT_EXEMPT = new Set(
  "vegan plant almond oat soy coconut peanut cashew rice dairy tartar hazelnut".split(" "),
);
const GLUTEN = new Set(
  (
    "wheat flour bread breadcrumb pasta spaghetti noodle couscous barley rye bulgur semolina " +
    "farro seitan cracker beer panko pita bagel croissant biscuit malt orzo udon ramen " +
    "macaroni lasagna lasagne penne fettuccine linguine gnocchi dumpling pastry brioche " +
    "baguette bun roll tortellini ravioli"
  ).split(" "),
);
const GLUTEN_EXEMPT = new Set(
  "rice almond coconut corn chickpea buckwheat tamari potato".split(" "),
);

export function violatesDiet(ingredientName: string, diet: Diet): boolean {
  if (diet === "None") return false;
  const t = tokens(ingredientName);
  if (diet === "Vegetarian" || diet === "Vegan") {
    if (t.some((w) => MEAT_FISH.has(w))) return true;
  }
  if (diet === "Vegan") {
    if (t.some((w) => ANIMAL_PRODUCTS.has(w)) && !t.some((w) => PLANT_EXEMPT.has(w))) return true;
  }
  if (diet === "Gluten-free") {
    const glutenFree = t.includes("gluten") && t.includes("free");
    if (t.includes("soy") && t.includes("sauce") && !glutenFree) return true;
    if (t.some((w) => GLUTEN.has(w)) && !glutenFree && !t.some((w) => GLUTEN_EXEMPT.has(w))) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------- recipes

export const MAX_MISSING = 3;
export const MAX_RECIPES = 4;

export type Constraints = {
  inventory: Ingredient[];
  servings: number;
  maxMinutes: TimeOption;
  diet: Diet;
};

export type RejectReason = "time" | "diet" | "too_many_missing" | "nothing_on_hand" | "duplicate";

export function validateRecipes(
  raw: RawRecipe[],
  c: Constraints,
): { recipes: Recipe[]; rejected: Array<{ name: string; reason: RejectReason }> } {
  const limit = TIME_LIMIT_MINUTES[c.maxMinutes];
  const recipes: Recipe[] = [];
  const rejected: Array<{ name: string; reason: RejectReason }> = [];
  const names = new Set<string>();

  for (const r of raw) {
    const key = r.name.toLowerCase();
    if (names.has(key)) {
      rejected.push({ name: r.name, reason: "duplicate" });
      continue;
    }
    const total = r.prepMinutes + r.cookMinutes;
    if (total < 1 || total > limit) {
      rejected.push({ name: r.name, reason: "time" });
      continue;
    }
    if (r.ingredients.some((i) => violatesDiet(i.name, c.diet))) {
      rejected.push({ name: r.name, reason: "diet" });
      continue;
    }

    const seen = new Set<string>();
    const ingredients: RecipeIngredient[] = [];
    for (const i of r.ingredients) {
      const k = i.name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      const status: RecipeIngredient["status"] = isStaple(i.name)
        ? "staple"
        : c.inventory.some((inv) => covers(inv.name, i.name))
          ? "have"
          : "missing";
      ingredients.push({ name: i.name, measurement: i.measurement, status });
    }
    const counted = ingredients.filter((i) => i.status !== "staple");
    const have = counted.filter((i) => i.status === "have").length;
    const missing = counted.filter((i) => i.status === "missing").map((i) => i.name);
    if (have === 0) {
      rejected.push({ name: r.name, reason: "nothing_on_hand" });
      continue;
    }
    if (missing.length > MAX_MISSING) {
      rejected.push({ name: r.name, reason: "too_many_missing" });
      continue;
    }

    // Only keep swaps that replace a missing item with something the user has.
    const substitutes = r.substitutes.filter(
      (s) =>
        missing.some((m) => covers(s.from, m) || covers(m, s.from)) &&
        (isStaple(s.to) || c.inventory.some((inv) => covers(inv.name, s.to))),
    );

    names.add(key);
    recipes.push({
      id: `r${recipes.length + 1}`,
      name: r.name,
      description: r.description,
      prepMinutes: r.prepMinutes,
      cookMinutes: r.cookMinutes,
      totalMinutes: total,
      servings: c.servings,
      matchPercent: counted.length ? Math.round((have / counted.length) * 100) : 100,
      missing,
      ingredients,
      steps: r.steps,
      substitutes,
    });
  }

  recipes.sort((a, b) => a.missing.length - b.missing.length || a.totalMinutes - b.totalMinutes);
  return { recipes: recipes.slice(0, MAX_RECIPES), rejected };
}
