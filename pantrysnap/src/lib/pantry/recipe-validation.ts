// Independent verification of every AI recipe. Nothing the model claims about
// availability, time, servings or constraints is trusted: each is recomputed here
// from the recipe text and the user's confirmed ingredient list.
//
// Principle: never make a stronger claim than the evidence supports. When a check
// can't be done (e.g. whether amounts really feed N people), the recipe simply
// doesn't get that claim.
import type { RawRecipe } from "./ai-output";
import {
  ALCOHOL,
  canonicalText,
  covers,
  DAIRY,
  expandCompounds,
  GLUTEN,
  GLUTEN_EXEMPT,
  groupTokens,
  isStaple,
  MEAT,
  mentionedIngredients,
  NUTS,
  PLANT_EXEMPT,
  PORK,
  PROTEIN,
  refersTo,
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

/** Stock, broth or bouillon that doesn't say it's plant-based is assumed to be meat-based. */
const PLANT_STOCK = new Set(
  "vegetable veggie vegetarian vegan mushroom miso kombu dashi".split(" "),
);
function isUnqualifiedStock(t: string[]): boolean {
  return (
    t.some((w) => w === "stock" || w === "broth" || w === "bouillon") &&
    !t.some((w) => PLANT_STOCK.has(w))
  );
}

export function violatesDiet(ingredientName: string, diet: Diet): boolean {
  if (diet === "None") return false;
  // compound products are checked through their parts ("egg noodles" → egg, noodle)
  const t = groupTokens(ingredientName);
  const has = (group: Set<string>) => t.some((w) => group.has(w));
  if (
    (diet === "Vegetarian" || diet === "Vegan") &&
    (has(MEAT) || has(SEAFOOD) || t.includes("gelatin") || isUnqualifiedStock(t))
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
  alcohol: (t) => t.some((w) => ALCOHOL.has(w)) && !t.includes("vinegar"),
  alcoholic: (t) => t.some((w) => ALCOHOL.has(w)) && !t.includes("vinegar"),
  booze: (t) => t.some((w) => ALCOHOL.has(w)) && !t.includes("vinegar"),
};

/** Generic nouns that say nothing about which ingredient ("no spicy food" = "no spicy"). */
const GENERIC_NOUNS = new Set(
  (
    "food stuff thing dish meal flavor flavour ingredient item kind type style product " +
    "option recipe cooking cuisine"
  ).split(" "),
);

/** Words that mean the phrase isn't about an ingredient ("no more than", "not too long"). */
const NOT_FOOD = new Set(
  (
    "more less than too much many very fuss hassle time long hard complicated expensive " +
    "idea problem preference restriction thank thanks please need want heavy light fancy " +
    "boring weird picky something anything crispy crunchy filling healthy quick easy simple " +
    "cheap comforting tasty good nice different new like fried greasy oily processed junk"
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
          (w) =>
            !["any", "anything", "too", "t"].includes(w) &&
            !TRIGGER_WORDS.has(w) &&
            !GENERIC_NOUNS.has(w),
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

const UNITS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};
const NUMBER_WORD = new RegExp(
  `\\b(?:(${Object.keys(TENS).join("|")})(?:[\\s-]+(${Object.keys(UNITS).slice(0, 9).join("|")}))?|(${Object.keys(UNITS).join("|")}))\\b`,
  "g",
);

/** "twenty-five" → "25", "eleven" → "11"; other text unchanged. */
function numberWordsToDigits(text: string): string {
  return text.replace(NUMBER_WORD, (_, tens?: string, unit?: string, single?: string) =>
    String(tens ? TENS[tens]! + (unit ? UNITS[unit]! : 0) : UNITS[single!]!),
  );
}

/** Durations (in minutes, lower bound of any range) explicitly mentioned in one step. */
export function stepDurations(step: string): number[] {
  const s = numberWordsToDigits(step.toLowerCase())
    .replace(/(\d+)\s+(\d)\/(\d)/g, (_, w, n, d) => String(Number(w) + Number(n) / Number(d)))
    .replace(/(\d)\/(\d)/g, (_, n, d) => String(Number(n) / Number(d)))
    .replace(/half an hour/g, "30 minutes");
  const out: number[] = [];
  const re =
    /(\d+(?:\.\d+)?|\ba|\ban)(?:\s*(?:-|–|to)\s*\d+(?:\.\d+)?)?\s*(hours?|hrs?|minutes?|mins?)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const raw = m[1]!;
    const n = /\d/.test(raw) ? Number(raw) : 1;
    out.push(/^h/.test(m[2]!) ? n * 60 : n);
  }
  if (/\bovernight\b/.test(s)) out.push(8 * 60);
  return out.filter((n) => Number.isFinite(n) && n > 0);
}

/** Words that say steps run in parallel, so their durations must not be added up. */
const OVERLAP = /\b(?:meanwhile|while|at the same time|in the meantime)\b/i;

/**
 * Time check against a limit in minutes. Total = max(stated prep+cook, longest step).
 * Rejects when that exceeds the limit, or when sequential step durations clearly do
 * (sum > limit + max(5, 25%)). Smaller or ambiguous overruns are shown as a range instead.
 */
export function checkTime(
  r: Pick<RawRecipe, "prepMinutes" | "cookMinutes" | "steps">,
  limit: number,
):
  | { ok: true; total: number; upper: number | null }
  | { ok: false; reason: "time" | "time_contradiction" } {
  const stated = r.prepMinutes + r.cookMinutes;
  if (stated < 1) return { ok: false, reason: "time" };
  const durations = r.steps.flatMap(stepDurations);
  const longest = Math.max(0, ...durations);
  const sum = durations.reduce((a, b) => a + b, 0);
  const total = Math.max(stated, longest);
  if (total > limit) return { ok: false, reason: longest > stated ? "time_contradiction" : "time" };
  const parallel = r.steps.some((s) => OVERLAP.test(s));
  if (!parallel && sum > limit + Math.max(5, limit * 0.25)) {
    return { ok: false, reason: "time_contradiction" };
  }
  return { ok: true, total, upper: sum > total + 10 || sum > limit ? sum : null };
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
  /** Items without `confirmed` are treated as confirmed (typed or edited by the user). */
  inventory: Array<Omit<Ingredient, "confirmed"> & { confirmed?: boolean }>;
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

/**
 * Ingredients a step mentions, split by whether the step relies on them. Optional
 * sentences ("Optional: top with bacon", "cheddar if you like") don't make an ingredient
 * needed, but still count for diet and exclusion checks. Negated mentions ("without
 * butter") count for neither.
 */
function stepMentions(step: string, recipeName: string) {
  const required: string[] = [];
  const optional: string[] = [];
  for (const sentence of step.split(/[.;]\s+|\n/)) {
    const lower = sentence.toLowerCase();
    const found = mentionedIngredients(lower.replace(NEGATED_MENTION, " "), recipeName);
    (OPTIONAL_SENTENCE.test(lower) ? optional : required).push(...found);
  }
  return { required, optional };
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
  const optionalMentions: string[] = [];
  for (const step of r.steps) {
    const { required, optional } = stepMentions(step, r.name);
    optionalMentions.push(...optional);
    for (const mention of required) {
      // A listed item must cover the mention: a listed "oil" does not cover "sesame oil".
      if (listedNames.some((n) => refersTo(n, mention))) continue;
      listedNames.push(mention);
      listed.set(`step:${mention}`, { name: mention, measurement: "", fromSteps: true });
    }
  }
  const all = [...listed.values()];

  // Diet and exclusions apply to everything the recipe mentions, optional items included,
  // and literal exclusions also to the raw step text.
  const checkedNames = [...all.map((i) => i.name), ...optionalMentions];
  const stepWords = expandCompounds(r.steps.flatMap((s) => words(s)));
  if (checkedNames.some((n) => violatesDiet(n, c.diet))) return { ok: false, reason: "diet" };
  for (const ex of c.exclusions) {
    if (checkedNames.some((n) => ex.test(groupTokens(n))) || (!ex.group && ex.test(stepWords))) {
      return { ok: false, reason: "excluded" };
    }
  }

  const time = checkTime(r, limit);
  if (!time.ok) return time;
  const { total, upper } = time;

  // Availability against the user's list. Only items the user confirmed can support
  // "everything on hand"; a scanned item nobody confirmed is reported as "unconfirmed".
  const confirmedInventory = c.inventory.filter((inv) => inv.confirmed !== false);
  const unconfirmedInventory = c.inventory.filter((inv) => inv.confirmed === false);
  const ingredients: RecipeIngredient[] = all.map((i) => {
    if (isStaple(i.name)) return { ...i, status: "staple", short: null };
    const match = confirmedInventory.find((inv) => covers(inv.name, i.name));
    if (!match) {
      const guess = unconfirmedInventory.some((inv) => covers(inv.name, i.name));
      return { ...i, status: guess ? "unconfirmed" : "missing", short: null };
    }
    const need = plainCount(i.measurement);
    const have = plainCount(match.quantity);
    const short = need !== null && have !== null && need > have ? { need, have } : null;
    return { ...i, status: "have", short };
  });
  const counted = ingredients.filter((i) => i.status !== "staple");
  const haveCount = counted.filter((i) => i.status === "have").length;
  const missing = counted.filter((i) => i.status === "missing").map((i) => i.name);
  const unconfirmed = counted.filter((i) => i.status === "unconfirmed").map((i) => i.name);
  if (haveCount + unconfirmed.length === 0) return { ok: false, reason: "nothing_on_hand" };
  if (missing.length > MAX_MISSING) return { ok: false, reason: "too_many_missing" };

  // Requested traits need evidence in the ingredients.
  const proteins = counted.filter((i) => isProteinSource(i.name)).map((i) => i.name);
  const spicy = ingredients.filter((i) => isSpicyIngredient(i.name)).map((i) => i.name);
  if (c.highProtein && proteins.length === 0) return { ok: false, reason: "not_high_protein" };
  if (c.spicy && spicy.length === 0) return { ok: false, reason: "not_spicy" };
  if (c.kidFriendly && !c.spicy && spicy.length > 0)
    return { ok: false, reason: "too_spicy_for_kids" };

  // Substitutions must replace a missing item with something the user confirmed they have.
  const substitutes = r.substitutes.filter(
    (s) =>
      missing.some((m) => sameIngredient(s.from, m)) &&
      (isStaple(s.to) || confirmedInventory.some((inv) => covers(inv.name, s.to))) &&
      !c.exclusions.some((ex) => ex.test(groupTokens(s.to))) &&
      !violatesDiet(s.to, c.diet),
  );

  const everythingOnHand =
    missing.length === 0 && unconfirmed.length === 0 && ingredients.every((i) => !i.short);
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
      unconfirmed,
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
      a.missing.length + a.unconfirmed.length - (b.missing.length + b.unconfirmed.length) ||
      a.totalMinutes - b.totalMinutes,
  );
  return { recipes: recipes.slice(0, MAX_RECIPES), rejected };
}
