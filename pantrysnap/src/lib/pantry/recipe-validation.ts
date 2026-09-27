// Independent verification of every AI recipe. Nothing the model claims about
// availability, time, servings or constraints is trusted: each is recomputed here
// from the recipe text and the user's confirmed ingredient list.
//
// Principle: never make a stronger claim than the evidence supports. When a check
// can't be done (e.g. whether amounts really feed N people), the recipe simply
// doesn't get that claim.
import type { RawRecipe } from "./ai-output";
import {
  canonicalText,
  covers,
  DAIRY,
  GLUTEN,
  GLUTEN_EXEMPT,
  isStaple,
  MEAT,
  mentionedIngredients,
  NUTS,
  PLANT_EXEMPT,
  PORK,
  PROTEIN,
  sameIngredient,
  SEAFOOD,
  SPICY,
  tokens,
  words,
} from "./ingredients";
import {
  TIME_LIMIT_MINUTES,
  type Diet,
  type Ingredient,
  type Recipe,
  type RecipeIngredient,
  type TimeOption,
} from "./schemas";

export { covers, isStaple } from "./ingredients";

export const MAX_MISSING = 3;
export const MAX_RECIPES = 4;

// ---------------------------------------------------------------------------- diet & evidence

export function violatesDiet(ingredientName: string, diet: Diet): boolean {
  if (diet === "None") return false;
  const t = tokens(ingredientName);
  const has = (group: Set<string>) => t.some((w) => group.has(w));
  if (
    (diet === "Vegetarian" || diet === "Vegan") &&
    (has(MEAT) || has(SEAFOOD) || t.includes("gelatin"))
  ) {
    return true;
  }
  if (diet === "Vegan") {
    const animal =
      has(DAIRY) ||
      t.includes("egg") ||
      t.includes("honey") ||
      t.includes("mayonnaise") ||
      t.includes("mayo");
    if (animal && !has(PLANT_EXEMPT)) return true;
  }
  if (diet === "Gluten-free") {
    const glutenFree = t.includes("gluten") && t.includes("free");
    if (t.includes("soy") && t.includes("sauce") && !glutenFree) return true;
    if (has(GLUTEN) && !glutenFree && !has(GLUTEN_EXEMPT)) return true;
  }
  return false;
}

export function isSpicyIngredient(name: string): boolean {
  const t = tokens(name);
  return t.some((w) => SPICY.has(w)) || (t.includes("hot") && t.includes("sauce"));
}

export function isProteinSource(name: string): boolean {
  const t = tokens(name);
  if (t.includes("green") && t.includes("bean")) return false;
  if (t.some((w) => ["sauce", "stock", "broth", "powder", "flavored", "flavoured"].includes(w))) {
    return false;
  }
  return t.some((w) => PROTEIN.has(w));
}

// ---------------------------------------------------------------------------- exclusions

const EXCLUSION_GROUPS: Record<string, (t: string[]) => boolean> = {
  dairy: (t) => t.some((w) => DAIRY.has(w)) && !t.some((w) => PLANT_EXEMPT.has(w)),
  meat: (t) => t.some((w) => MEAT.has(w)),
  fish: (t) => t.some((w) => SEAFOOD.has(w)),
  seafood: (t) => t.some((w) => SEAFOOD.has(w)),
  shellfish: (t) => t.some((w) => SEAFOOD.has(w)),
  nut: (t) => t.some((w) => NUTS.has(w)) && !t.includes("nutmeg"),
  gluten: (t) => t.some((w) => GLUTEN.has(w)) && !t.some((w) => GLUTEN_EXEMPT.has(w)),
  pork: (t) => t.some((w) => PORK.has(w)),
  egg: (t) => t.includes("egg"),
  spicy: (t) => t.some((w) => SPICY.has(w)) || (t.includes("hot") && t.includes("sauce")),
  spice: (t) => t.some((w) => SPICY.has(w)),
  heat: (t) => t.some((w) => SPICY.has(w)),
  hot: (t) => t.some((w) => SPICY.has(w)) || (t.includes("hot") && t.includes("sauce")),
};

/** Words that mean the phrase isn't about an ingredient ("no more than", "not too long"). */
const NOT_FOOD = new Set(
  (
    "more less than too much many very fuss hassle time long hard complicated expensive " +
    "idea problem preference restriction thank thanks please need want heavy light fancy " +
    "boring weird picky something anything crispy crunchy filling healthy quick easy simple " +
    "cheap comforting tasty good nice different new like"
  ).split(" "),
);

export type Exclusion = {
  label: string;
  /** Category exclusions ("dairy") are tested per ingredient; literal ones also against step text. */
  group: boolean;
  test: (tokens: string[]) => boolean;
};

/**
 * Pulls explicit exclusions out of the free-text request: "no mushrooms", "without onion
 * or garlic", "dairy-free", "allergic to peanuts", "not spicy". Anything unrecognised is
 * simply passed to the AI as a preference.
 */
const TRIGGER_WORDS = new Set(
  "no not without avoid avoiding exclude excluding except hate dislike allergic allergy don dont like can cant eat nothing".split(
    " ",
  ),
);

export function parseExclusions(note: string): Exclusion[] {
  const triggers =
    /\b(?:no|not|without|avoid|avoiding|exclude|excluding|except|hate|dislike|allergic to|allergy to|don t like|dont like|can t eat|cant eat|nothing)\b/g;
  const labels = new Set<string>();
  for (const sentence of note.replace(/([a-z]+)[- ]free\b/gi, " no $1 ").split(/[.;!?\n]+/)) {
    // keep list separators: canonicalText strips punctuation
    const text = canonicalText(sentence.replace(/,/g, " and "));
    let match: RegExpExecArray | null;
    triggers.lastIndex = 0;
    while ((match = triggers.exec(text))) {
      const rest = text.slice(match.index + match[0].length);
      const clause = rest.split(/\bbut\b|\bplease\b|\bi want\b|\bwith\b/)[0] ?? "";
      for (const part of clause.split(/\s+(?:or|and|nor)\s+|\s*,\s*/)) {
        const t = tokens(part).filter(
          (w) => !["any", "anything", "too", "t"].includes(w) && !TRIGGER_WORDS.has(w),
        );
        if (t.length === 0 || t.length > 3 || t.some((w) => NOT_FOOD.has(w))) continue;
        labels.add(t.join(" "));
      }
    }
  }
  return [...labels].slice(0, 10).map((label) => {
    const t = label.split(" ");
    const group = t.length === 1 ? EXCLUSION_GROUPS[t[0]!] : undefined;
    return group
      ? { label, group: true, test: group }
      : { label, group: false, test: (ing: string[]) => t.every((w) => ing.includes(w)) };
  });
}

// ---------------------------------------------------------------------------- time

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  ten: 10,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
};

/** Durations (in minutes, lower bound of any range) explicitly mentioned in one step. */
export function stepDurations(step: string): number[] {
  const s = step
    .toLowerCase()
    .replace(/(\d+)\s+(\d)\/(\d)/g, (_, w, n, d) => String(Number(w) + Number(n) / Number(d)))
    .replace(/(\d)\/(\d)/g, (_, n, d) => String(Number(n) / Number(d)))
    .replace(/half an hour/g, "30 minutes");
  const out: number[] = [];
  const re =
    /(\d+(?:\.\d+)?|a|an|one|two|three|four|five|ten|fifteen|twenty|thirty)(?:\s*(?:-|–|to)\s*\d+(?:\.\d+)?)?\s*(hours?|hrs?|minutes?|mins?)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const raw = m[1]!;
    const n = /\d/.test(raw) ? Number(raw) : (NUMBER_WORDS[raw] ?? 0);
    out.push(/^h/.test(m[2]!) ? n * 60 : n);
  }
  if (/\bovernight\b/.test(s)) out.push(8 * 60);
  return out.filter((n) => Number.isFinite(n) && n > 0);
}

// ---------------------------------------------------------------------------- servings & amounts

function statedServingCounts(text: string): number[] {
  const out: number[] = [];
  const re = /\b(?:serves|feeds)\s+(\d{1,3})\b|\b(\d{1,3})\s+(?:servings|portions|people)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(Number(m[1] ?? m[2]));
  return out;
}

const UNIT_WORDS =
  /\b(cups?|tbsp|tsp|tablespoons?|teaspoons?|g|grams?|kg|oz|ounces?|lbs?|pounds?|ml|l|litres?|liters?|cans?|tins?|bags?|packs?|slices?|cloves?|pinch|handful|bunch|jars?|sticks?|inch)\b/;

/** A plain count like "4", "4 large", "4 eggs"; null for anything with units or ranges. */
export function plainCount(quantity: string): number | null {
  const q = quantity.trim().toLowerCase();
  if (!q || UNIT_WORDS.test(q)) return null;
  if (/^(?:a )?dozen\b/.test(q)) return 12;
  const m = q.match(/^(\d{1,3})(?:\s+(?:large|medium|small|whole|x))?(?:\s+[a-z]+)?$/);
  return m ? Number(m[1]) : null;
}

// ---------------------------------------------------------------------------- verification

export type Constraints = {
  inventory: Ingredient[];
  servings: number;
  maxMinutes: TimeOption;
  diet: Diet;
  highProtein: boolean;
  spicy: boolean;
  kidFriendly: boolean;
  exclusions: Exclusion[];
};

export type RejectReason =
  | "duplicate"
  | "time"
  | "time_contradiction"
  | "servings"
  | "diet"
  | "excluded"
  | "not_high_protein"
  | "not_spicy"
  | "too_spicy_for_kids"
  | "too_many_missing"
  | "nothing_on_hand";

const OPTIONAL_SENTENCE =
  /\b(optional(?:ly)?|if desired|if you (?:like|have|want|prefer)|if using|to taste, optional)\b/;
const NEGATED_MENTION =
  /\b(?:without|instead of|no need for|in place of|skip the|omit the)\s+(?:the\s+)?[a-z]+(?:\s+[a-z]+)?/g;

/** Ingredients a step relies on, ignoring optional sentences and negated mentions. */
function requiredStepMentions(step: string, recipeName: string): string[] {
  const found: string[] = [];
  for (const sentence of step.split(/[.;]\s+|\n/)) {
    const lower = sentence.toLowerCase();
    if (OPTIONAL_SENTENCE.test(lower)) continue;
    found.push(...mentionedIngredients(lower.replace(NEGATED_MENTION, " "), recipeName));
  }
  return found;
}

export function verifyRecipe(
  r: RawRecipe,
  c: Constraints,
): { ok: true; recipe: Omit<Recipe, "id"> } | { ok: false; reason: RejectReason } {
  const limit = TIME_LIMIT_MINUTES[c.maxMinutes];

  // Servings: the AI must not state a different count anywhere.
  const servingMentions = [
    r.servings,
    ...statedServingCounts([r.description, ...r.steps].join(" ")),
  ];
  if (servingMentions.some((n) => n !== null && n !== c.servings))
    return { ok: false, reason: "servings" };
  const servingsStated = r.servings === c.servings;

  // Ingredients: listed ones plus anything the steps rely on but the list omits.
  const listed = new Map<string, { name: string; measurement: string; fromSteps: boolean }>();
  for (const i of r.ingredients) {
    const key = tokens(i.name).sort().join(" ") || i.name.toLowerCase();
    if (!listed.has(key)) listed.set(key, { ...i, fromSteps: false });
  }
  const listedNames = [...listed.values()].map((i) => i.name);
  for (const step of r.steps) {
    for (const mention of requiredStepMentions(step, r.name)) {
      // A listed item must cover the mention: a listed "oil" does not cover "sesame oil".
      if (listedNames.some((n) => covers(n, mention))) continue;
      listedNames.push(mention);
      listed.set(`step:${mention}`, { name: mention, measurement: "", fromSteps: true });
    }
  }
  const all = [...listed.values()];

  // Constraints that apply to every ingredient, including step-only ones and step text.
  const stepWords = r.steps.flatMap((s) => words(s));
  if (all.some((i) => violatesDiet(i.name, c.diet))) return { ok: false, reason: "diet" };
  for (const ex of c.exclusions) {
    if (all.some((i) => ex.test(tokens(i.name))) || (!ex.group && ex.test(stepWords))) {
      return { ok: false, reason: "excluded" };
    }
  }

  // Time: stated total, but never less than the longest single step; flag if steps add up to more.
  const stated = r.prepMinutes + r.cookMinutes;
  if (stated < 1) return { ok: false, reason: "time" };
  const durations = r.steps.flatMap(stepDurations);
  const longest = Math.max(0, ...durations);
  const sum = durations.reduce((a, b) => a + b, 0);
  const total = Math.max(stated, longest);
  if (total > limit) return { ok: false, reason: longest > stated ? "time_contradiction" : "time" };
  const upper = sum > total + 10 ? sum : null;

  // Availability, computed against the confirmed list.
  const ingredients: RecipeIngredient[] = all.map((i) => {
    if (isStaple(i.name)) return { ...i, status: "staple", short: null };
    const match = c.inventory.find((inv) => covers(inv.name, i.name));
    if (!match) return { ...i, status: "missing", short: null };
    const need = plainCount(i.measurement);
    const have = plainCount(match.quantity);
    const short = need !== null && have !== null && need > have ? { need, have } : null;
    return { ...i, status: "have", short };
  });
  const counted = ingredients.filter((i) => i.status !== "staple");
  const haveCount = counted.filter((i) => i.status === "have").length;
  const missing = counted.filter((i) => i.status === "missing").map((i) => i.name);
  if (haveCount === 0) return { ok: false, reason: "nothing_on_hand" };
  if (missing.length > MAX_MISSING) return { ok: false, reason: "too_many_missing" };

  // Requested traits need evidence in the ingredients.
  const proteins = counted.filter((i) => isProteinSource(i.name)).map((i) => i.name);
  const spicy = ingredients.filter((i) => isSpicyIngredient(i.name)).map((i) => i.name);
  if (c.highProtein && proteins.length === 0) return { ok: false, reason: "not_high_protein" };
  if (c.spicy && spicy.length === 0) return { ok: false, reason: "not_spicy" };
  if (c.kidFriendly && !c.spicy && spicy.length > 0)
    return { ok: false, reason: "too_spicy_for_kids" };

  // Substitutions must replace a missing item with something the user actually has.
  const substitutes = r.substitutes.filter(
    (s) =>
      missing.some((m) => sameIngredient(s.from, m)) &&
      (isStaple(s.to) || c.inventory.some((inv) => covers(inv.name, s.to))) &&
      !c.exclusions.some((ex) => ex.test(tokens(s.to))) &&
      !violatesDiet(s.to, c.diet),
  );

  const everythingOnHand = missing.length === 0 && ingredients.every((i) => !i.short);
  const checks: string[] = [];
  if (upper === null && total <= 20) checks.push("Quick");
  if (c.diet !== "None") checks.push(`${c.diet} (checked)`);
  if (c.highProtein) checks.push(`Protein: ${proteins.slice(0, 3).join(", ")}`);
  if (c.spicy) checks.push(`Heat: ${spicy.slice(0, 2).join(", ")}`);
  if (c.exclusions.length) checks.push(`No ${c.exclusions.map((e) => e.label).join(", ")}`);

  return {
    ok: true,
    recipe: {
      name: r.name,
      description: r.description,
      whyItFits: r.whyItFits,
      prepMinutes: r.prepMinutes,
      cookMinutes: r.cookMinutes,
      totalMinutes: total,
      totalMinutesUpper: upper,
      servings: c.servings,
      servingsStated,
      matchPercent: counted.length ? Math.round((haveCount / counted.length) * 100) : 100,
      everythingOnHand,
      missing,
      ingredients,
      steps: r.steps,
      substitutes,
      checks,
    },
  };
}

export function validateRecipes(
  raw: RawRecipe[],
  c: Constraints,
): { recipes: Recipe[]; rejected: Array<{ name: string; reason: RejectReason }> } {
  const recipes: Recipe[] = [];
  const rejected: Array<{ name: string; reason: RejectReason }> = [];
  const names = new Set<string>();
  for (const r of raw) {
    const key = r.name.toLowerCase();
    if (names.has(key)) {
      rejected.push({ name: r.name, reason: "duplicate" });
      continue;
    }
    const result = verifyRecipe(r, c);
    if (!result.ok) {
      rejected.push({ name: r.name, reason: result.reason });
      continue;
    }
    names.add(key);
    recipes.push({ id: `r${recipes.length + 1}`, ...result.recipe });
  }
  recipes.sort(
    (a, b) =>
      Number(b.everythingOnHand) - Number(a.everythingOnHand) ||
      a.missing.length - b.missing.length ||
      a.totalMinutes - b.totalMinutes,
  );
  return { recipes: recipes.slice(0, MAX_RECIPES), rejected };
}
