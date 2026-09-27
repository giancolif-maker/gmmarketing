// One ingredient representation for every input path (photo detection, typed text,
// user edits) and one conservative matcher used by recipe verification.
//
// Matching rules are explicit (synonyms, categories, part-words, "transformer" words)
// rather than fuzzy: when unsure, two names are treated as different ingredients.
import { cleanText, LIMITS, type Ingredient } from "./schemas";

// ---------------------------------------------------------------------------- normalization

/**
 * Phrase rewrites applied before tokenizing. Order matters: more specific phrases first.
 * Each maps regional/alternate names onto one canonical name.
 */
const PHRASE_SYNONYMS: Array<[RegExp, string]> = [
  // compound products that must never match their parts ("cream cheese" is not "cheese")
  [/\bcream cheese\b/g, "creamcheese"],
  [/\bcottage cheese\b/g, "cottagecheese"],
  [/\b(?:ground coriander|coriander seeds?)\b/g, "coriander seed"],
  [/\b(?:coriander|cilantro)(?: leaves?)?\b(?! seed)/g, "cilantro"],
  [/\b(?:scallions?|spring onions?|green onions?)\b/g, "green onion"],
  [
    /\b(?:red pepper flakes|crushed red pepper|chil(?:l)?i flakes|chil(?:l)?i pepper flakes)\b/g,
    "chili flake",
  ],
  [/\b(?:capsicums?|sweet peppers?|bell peppers?)\b/g, "bell pepper"],
  [/\b(?:red|green|yellow|orange) peppers?\b/g, "bell pepper"],
  // bare plural "peppers" means bell peppers; singular "pepper" stays black pepper
  [
    /(?<!\b(?:chil(?:l)?i|chile|hot|jalapeno|cayenne|habanero|serrano|banana|piquillo|shishito|bell|black|white|pink) )\bpeppers\b/g,
    "bell pepper",
  ],
  [/\bchil(?:l)?ies\b|\bchilli\b|\bchile\b/g, "chili"],
  [/\bcourgettes?\b/g, "zucchini"],
  [/\baubergines?\b/g, "eggplant"],
  [/\b(?:garbanzo beans?|garbanzos?)\b/g, "chickpea"],
  [/\bprawns?\b/g, "shrimp"],
  [/\b(?:minced beef|beef mince)\b/g, "ground beef"],
  [/\b(?:double cream|heavy whipping cream|whipping cream)\b/g, "heavy cream"],
  [/\b(?:icing sugar|confectioners'? sugar)\b/g, "powdered sugar"],
  [/\brocket\b/g, "arugula"],
  [/\byoghurts?\b/g, "yogurt"],
  [/\b(?:mangetout|snow peas?)\b/g, "snow pea"],
  [/\b(?:bicarbonate of soda|bicarb soda)\b/g, "baking soda"],
  [/\b(?:plain flour|all[ -]purpose flour)\b/g, "flour"],
  [/\bbread ?crumbs?\b/g, "breadcrumb"],
];

/** Preparation / size / form words that don't change what the ingredient is. */
const DESCRIPTORS = new Set(
  (
    "fresh freshly chopped diced minced sliced grated shredded crushed large small medium " +
    "boneless skinless ripe cooked uncooked raw beaten softened melted finely roughly thinly " +
    "thick whole organic extra virgin optional taste of and or for a an the to into in plus " +
    "cup cups tbsp tsp tablespoon tablespoons teaspoon teaspoons g kg oz lb lbs ml l pinch " +
    "handful piece pieces can cans canned frozen dried dry ground leftover cold warm room " +
    "temperature unsalted salted plain peeled halved quartered cubed trimmed rinsed drained " +
    "packed about approx approximately few some more serve serving garnish baby young mini " +
    "bag bags pack packet jar bottle box block tub carton bunch container"
  ).split(" "),
);

/** Words that turn an ingredient into a different product ("coconut milk" ≠ "milk"). */
const TRANSFORMERS = new Set(
  (
    "coconut almond oat soy rice peanut cashew ice sour powder paste sauce stock broth " +
    "extract essence flavored flavoured syrup vinegar jam jelly chip chips cracker crackers " +
    "cake bread pudding soup seasoning mix flake seed"
  ).split(" "),
);

/** Extra words a more specific recipe item may add ("eggs" cover "egg yolks", "oil" covers "olive oil"). */
const PART_WORDS = new Set(
  (
    "cheese yolk white leaf clove breast thigh drumstick wing fillet filet zest juice " +
    "stalk sprig floret wedge slice head bulb kernel " +
    // generic "oil" covers everyday cooking oils
    "olive vegetable canola cooking neutral sunflower rapeseed"
  ).split(" "),
);

/** A generic recipe word ("cheese") is covered by any specific member the user has ("cheddar"). */
const CATEGORIES: Record<string, string[]> = {
  cheese: (
    "cheddar mozzarella parmesan feta gouda brie ricotta halloumi paneer provolone swiss " +
    "gruyere jack colby pecorino manchego emmental havarti"
  ).split(" "),
  pasta: (
    "spaghetti penne fusilli macaroni linguine fettuccine rigatoni farfalle orzo tagliatelle " +
    "rotini bucatini"
  ).split(" "),
  noodle: "ramen udon soba".split(" "),
  fish: "salmon tuna cod tilapia haddock trout halibut mackerel sardine pollock".split(" "),
};

const IRREGULAR: Record<string, string> = {
  leaves: "leaf",
  halves: "half",
  loaves: "loaf",
  cloves: "clove",
  olives: "olive",
};

function singular(word: string): string {
  if (IRREGULAR[word]) return IRREGULAR[word];
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (/(ches|shes|xes|sses)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us")) return word.slice(0, -1);
  return word;
}

/** Lowercase, strip accents, apply phrase synonyms. Shared by names and free text. */
export function canonicalText(text: string): string {
  let s = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z\s'-]/g, " ")
    .replace(/[-']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [pattern, replacement] of PHRASE_SYNONYMS) s = s.replace(pattern, replacement);
  return s;
}

/** Display names for internal compound tokens. */
const COMPOUND_DISPLAY: Record<string, string> = {
  creamcheese: "cream cheese",
  cottagecheese: "cottage cheese",
};

/** Words of free text (steps), singularized, descriptors kept. */
export function words(text: string): string[] {
  return canonicalText(text).split(" ").filter(Boolean).map(singular);
}

/** Identity tokens of an ingredient name: synonyms applied, singular, descriptors dropped. */
export function tokens(name: string): string[] {
  return [...new Set(words(name).filter((w) => !DESCRIPTORS.has(w)))];
}

/** Stable key used to de-duplicate ingredient lists ("Scallions" == "green onion"). */
export function ingredientKey(name: string): string {
  const t = tokens(name);
  return t.length ? [...t].sort().join(" ") : name.toLowerCase().trim();
}

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((t) => b.includes(t));
const subset = (a: string[], b: string[]) => a.length > 0 && a.every((t) => b.includes(t));

// ---------------------------------------------------------------------------- matching

const STAPLES = [["water"], ["salt"], ["pepper"], ["black", "pepper"], ["salt", "pepper"], ["ice"]];

export function isStaple(name: string): boolean {
  const t = tokens(name);
  return t.length > 0 && STAPLES.some((s) => sameSet(s, t));
}

/** Does an inventory item satisfy a recipe ingredient? Conservative by design. */
export function covers(inventoryName: string, recipeName: string): boolean {
  const inv = tokens(inventoryName);
  const rec = tokens(recipeName);
  if (!inv.length || !rec.length) return false;
  if (sameSet(inv, rec)) return true;
  // Inventory is more specific ("cheddar cheese" covers "cheese") unless the extra
  // words make it a different product ("coconut milk" does not cover "milk").
  if (subset(rec, inv)) {
    return inv.filter((t) => !rec.includes(t)).every((t) => !TRANSFORMERS.has(t));
  }
  // Recipe is more specific only by a part word ("eggs" cover "egg yolks").
  if (subset(inv, rec)) return rec.filter((t) => !inv.includes(t)).every((t) => PART_WORDS.has(t));
  // Generic category word ("cheese") covered by a specific member ("mozzarella").
  if (rec.length === 1) {
    const members = CATEGORIES[rec[0]!];
    if (members && inv.some((t) => members.includes(t)) && !inv.some((t) => TRANSFORMERS.has(t))) {
      return true;
    }
  }
  return false;
}

/** Either name satisfies the other — used to see if a step mention is already listed. */
export function sameIngredient(a: string, b: string): boolean {
  return covers(a, b) || covers(b, a);
}

// ---------------------------------------------------------------------------- lists

/** Normalizes any ingredient list (AI output, typed, edited) into the shared form. */
export function normalizeIngredients(
  items: Array<{ name: string; quantity?: string }>,
): Ingredient[] {
  const seen = new Set<string>();
  const out: Ingredient[] = [];
  for (const item of items) {
    const name = cleanText(item.name)
      .toLowerCase()
      .replace(/[.!?:]+$/, "")
      .trim();
    if (!name || name.length > LIMITS.maxIngredientNameChars) continue;
    if (!/[a-z]/.test(canonicalText(name))) continue;
    const key = ingredientKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, quantity: cleanText(item.quantity ?? "").slice(0, LIMITS.maxQuantityChars) });
    if (out.length >= LIMITS.maxIngredients) break;
  }
  return out;
}

const UNIT =
  "(?:cups?|cans?|tins?|bags?|packs?|packets?|lbs?|pounds?|oz|ounces?|g|grams?|kg|kilos?|ml|l|litres?|liters?|" +
  "bunch(?:es)?|heads?|cloves?|jars?|bottles?|boxes?|blocks?|tubs?|cartons?|dozen|slices?|pieces?|sticks?|loaf|loaves)";
const LEADING_QTY = new RegExp(
  `^((?:\\d+(?:[.,/]\\d+)?|half|one|two|three|four|five|six|a dozen|dozen)(?:\\s+${UNIT})?)(?:\\s+of)?\\s+(.+)$`,
  "i",
);

/**
 * Parses typed input: one ingredient per line and/or comma/semicolon separated.
 * "2 chicken breasts" → {name: "chicken breasts", quantity: "2"}; "eggs (6)" → quantity "6".
 */
export function parseTypedIngredients(text: string): Ingredient[] {
  const pieces = text
    .slice(0, 4000)
    .split(/[\n,;•·]+/)
    .map((p) => p.replace(/^\s*(?:[-*]+|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
  const items = pieces.map((piece) => {
    let name = piece.replace(/^(?:a|an|some)\s+/i, "");
    let quantity = "";
    const paren = name.match(/^(.*?)\s*\(([^)]{1,30})\)\s*$/);
    if (paren?.[1]) {
      name = paren[1];
      quantity = paren[2] ?? "";
    }
    const trailing = name.match(/^(.*?)\s+x\s?(\d{1,3})$/i);
    if (trailing?.[1]) {
      name = trailing[1];
      quantity = trailing[2] ?? "";
    }
    const leading = name.match(LEADING_QTY);
    if (!quantity && leading?.[2]) {
      quantity = leading[1] ?? "";
      name = leading[2].replace(/^(?:a|an)\s+/i, "");
    }
    return { name, quantity };
  });
  return normalizeIngredients(items);
}

// ---------------------------------------------------------------------------- vocabulary

/**
 * Ingredients recognised when they appear inside recipe steps. Deliberately limited to
 * unambiguous food nouns; multi-word phrases are matched before their parts.
 */
const VOCAB_PHRASES = (
  "cream of tartar|soy sauce|fish sauce|oyster sauce|hot sauce|worcestershire sauce|tomato sauce|tomato paste|" +
  "sesame oil|olive oil|vegetable oil|coconut oil|coconut milk|coconut cream|peanut butter|almond milk|" +
  "chicken broth|chicken stock|beef broth|beef stock|vegetable broth|vegetable stock|" +
  "heavy cream|sour cream|ice cream|goat cheese|" +
  "brown sugar|powdered sugar|maple syrup|lemon juice|lime juice|orange juice|" +
  "chili flake|chili powder|curry powder|curry paste|garlic powder|onion powder|" +
  "baking powder|baking soda|sesame seed|coriander seed|green onion|bell pepper|" +
  "ground beef|rice vinegar|balsamic vinegar|red wine|white wine|pine nut|" +
  "black bean|kidney bean|green bean|sweet potato|red onion|cherry tomato"
)
  .split("|")
  .map((p) => p.split(" "));

const VOCAB_WORDS = new Set(
  (
    "onion garlic ginger shallot leek tomato potato carrot celery spinach kale lettuce cabbage " +
    "broccoli cauliflower zucchini eggplant mushroom pea corn bean chickpea lentil rice pasta " +
    "noodle bread tortilla flour sugar honey butter oil vinegar milk cream cheese cheddar " +
    "mozzarella parmesan feta yogurt egg chicken beef pork bacon ham sausage turkey lamb salmon " +
    "tuna shrimp tofu tempeh lemon lime orange apple banana avocado cucumber jalapeno chili " +
    "cilantro parsley basil oregano thyme rosemary mint dill cumin paprika cinnamon nutmeg " +
    "turmeric cayenne ketchup mustard mayonnaise mayo sriracha salsa wine quinoa oat couscous " +
    "spaghetti penne macaroni breadcrumb panko cornstarch walnut almond peanut cashew pecan " +
    "olive caper anchovy sesame coconut raisin chocolate cocoa vanilla gochujang harissa miso " +
    "tahini hummus pesto kimchi arugula asparagus beet radish squash pumpkin edamame " +
    "chorizo prosciutto pancetta salami pepperoni ricotta halloumi paneer gouda brie " +
    "lemongrass scallop crab lobster clam mussel cod tilapia creamcheese cottagecheese"
  ).split(" "),
);

/** Dish words that can be a recipe's own name rather than an ingredient ("Turkey Chili"). */
const DISH_WORDS = new Set("chili curry salsa pesto hummus kimchi".split(" "));

/** Finds ingredient mentions in free text (e.g. a recipe step). */
export function mentionedIngredients(text: string, recipeName = ""): string[] {
  const w = words(text);
  const nameWords = new Set(words(recipeName));
  const used = new Array<boolean>(w.length).fill(false);
  const found: Array<{ at: number; name: string }> = [];
  for (const phrase of VOCAB_PHRASES) {
    for (let i = 0; i + phrase.length <= w.length; i++) {
      if (phrase.every((p, j) => w[i + j] === p && !used[i + j])) {
        for (let j = 0; j < phrase.length; j++) used[i + j] = true;
        found.push({ at: i, name: phrase.join(" ") });
      }
    }
  }
  for (let i = 0; i < w.length; i++) {
    const word = w[i]!;
    if (used[i] || !VOCAB_WORDS.has(word)) continue;
    if (DISH_WORDS.has(word) && nameWords.has(word)) continue;
    found.push({ at: i, name: COMPOUND_DISPLAY[word] ?? word });
  }
  found.sort((a, b) => a.at - b.at);
  return [...new Set(found.map((f) => f.name))];
}

// ---------------------------------------------------------------------------- groups

const set = (s: string) => new Set(s.split(" "));

export const MEAT = set(
  "beef pork chicken turkey lamb mutton goat bacon ham sausage salami pepperoni prosciutto " +
    "pancetta chorizo steak veal duck goose venison meat meatball lard hotdog",
);
export const SEAFOOD = set(
  "fish salmon tuna cod tilapia halibut trout sardine anchovy mackerel haddock pollock shrimp " +
    "crab lobster clam mussel oyster scallop squid calamari octopus worcestershire",
);
export const DAIRY = set(
  "milk butter cheese cream yogurt ghee whey casein parmesan mozzarella cheddar feta ricotta " +
    "buttermilk custard brie gouda halloumi paneer creamcheese cottagecheese",
);
export const PLANT_EXEMPT = set(
  "vegan plant almond oat soy coconut peanut cashew rice dairy tartar hazelnut",
);
export const GLUTEN = set(
  "wheat flour bread breadcrumb pasta spaghetti noodle couscous barley rye bulgur semolina " +
    "farro seitan cracker beer panko pita bagel croissant biscuit malt orzo udon ramen " +
    "macaroni lasagna lasagne penne fettuccine linguine gnocchi dumpling pastry brioche " +
    "baguette bun roll tortellini ravioli",
);
export const GLUTEN_EXEMPT = set("rice almond coconut corn chickpea buckwheat tamari potato");
export const NUTS = set("almond walnut pecan cashew peanut hazelnut pistachio macadamia pine");
export const PORK = set("pork bacon ham prosciutto pancetta chorizo salami pepperoni lard sausage");
/** Evidence that a recipe is spicy. */
export const SPICY = set(
  "chili jalapeno cayenne sriracha gochujang harissa habanero serrano chipotle sambal wasabi",
);
/** Evidence that a recipe contains a substantial protein source. */
export const PROTEIN = set(
  "chicken beef pork turkey lamb steak fish salmon tuna cod tilapia shrimp prawn egg tofu " +
    "tempeh seitan lentil chickpea bean edamame yogurt cottagecheese ricotta paneer halloumi " +
    "sausage ham bacon crab scallop mussel",
);
