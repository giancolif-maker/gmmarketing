// Controlled, LABELLED vision-error injection. These outputs are synthetic: they test how the
// product behaves given a class of mistake. They are NOT estimates of real model accuracy.
import type { Kitchen, TruthItem } from "./kitchens";

export const ERROR_CLASSES = {
  A: "perfect detection",
  B: "one false negative",
  C: "multiple false negatives",
  D: "one false positive (mundane item)",
  E: "multiple false positives",
  F: "duplicate detection",
  G: "synonym / regional name",
  H: "brand name instead of ingredient",
  I: "ambiguous / vague name",
  J: "quantity error",
  K: "completely empty detection",
  L: "confident but incorrect identity",
  M: "salient hallucination (protein)",
  N: "packaged item misread as its parent",
  O: "visually similar item confusion",
} as const;
export type ErrorClass = keyof typeof ERROR_CLASSES;

export type Injected = { cls: ErrorClass; truth?: string; detected?: string; note?: string };
export type SimDetection = {
  detected: Array<{ name: string; quantity: string }>;
  injected: Injected[];
};

const SYNONYMS: Record<string, string> = {
  "green onions": "scallions",
  cilantro: "coriander",
  zucchini: "courgette",
  "bell peppers": "capsicum",
  shrimp: "prawns",
  chickpeas: "garbanzo beans",
  "heavy cream": "double cream",
  "powdered sugar": "icing sugar",
  yogurt: "yoghurt",
  "greek yogurt": "greek yoghurt",
  "ground beef": "beef mince",
  "cheddar cheese": "cheddar",
  "chicken breast": "chicken breasts",
  tomatoes: "tomato",
  eggs: "egg",
  potatoes: "potato",
  onions: "onion",
  lemons: "lemon",
  jalapenos: "jalapeño peppers",
  cornstarch: "cornflour",
  limes: "lime",
  "mixed greens": "salad leaves",
  "ground turkey": "turkey mince",
  "sweet potatoes": "sweet potato",
  "chicken thighs": "chicken thigh",
  carrots: "carrot",
  "canned tomatoes": "tinned tomatoes",
};
const BRANDS: Record<string, string> = {
  "cream cheese": "Philadelphia",
  mayonnaise: "Hellmann's",
  ketchup: "Heinz",
  "greek yogurt": "Chobani",
  sriracha: "Huy Fong",
  "peanut butter": "Jif",
  parmesan: "Kraft Parmesan",
  "hot sauce": "Tabasco",
  "soy sauce": "Kikkoman",
  pasta: "Barilla",
  spaghetti: "Barilla spaghetti",
  tortillas: "Mission wraps",
  butter: "Kerrygold",
  "instant ramen": "Maruchan",
  cereal: "Cheerios",
  "chicken nuggets": "Tyson nuggets",
  "bbq sauce": "Sweet Baby Ray's",
  hummus: "Sabra",
  "ranch dressing": "Hidden Valley",
  oats: "Quaker",
  gochujang: "Chung Jung One",
  "fish sauce": "Red Boat",
  tamari: "San-J",
};
const AMBIGUOUS: Record<string, string> = {
  "cheddar cheese": "cheese",
  mozzarella: "cheese",
  "chicken breast": "meat",
  "ground beef": "meat",
  spinach: "greens",
  kale: "greens",
  "leftover rice": "leftovers",
  pesto: "green sauce",
  salsa: "sauce",
  hummus: "dip",
  "greek yogurt": "white tub",
  "sour cream": "white tub",
  "cooked rice": "container",
  "chicken thighs": "meat",
  "leftover soup": "soup",
  tofu: "white block",
  "roast chicken": "leftovers",
};
const CONFIDENT_WRONG: Record<string, string> = {
  tofu: "chicken breast",
  cauliflower: "broccoli",
  zucchini: "cucumber",
  "sweet potatoes": "carrots",
  salmon: "tuna",
  ricotta: "cottage cheese",
  feta: "tofu",
  tempeh: "chicken",
  "ground turkey": "ground beef",
  cod: "chicken breast",
  paneer: "tofu",
  "lamb mince": "ground beef",
  "pork belly": "bacon",
  mushrooms: "potatoes",
};
const PACKAGED_PARENT: Record<string, string> = {
  "coconut milk": "milk",
  "almond milk": "milk",
  "oat milk": "milk",
  "chicken broth": "chicken",
  "chicken stock": "chicken",
  "beef broth": "beef",
  "vegetable stock": "vegetables",
  "tomato paste": "tomatoes",
  "cream cheese": "cheese",
  "peanut butter": "butter",
  "sesame oil": "oil",
  "almond flour": "flour",
  "chili powder": "chili",
  "curry paste": "curry",
  "red curry paste": "curry",
  "rice vinegar": "rice",
  "coconut oil": "coconut",
  "cocoa powder": "cocoa",
  "ice cream": "cream",
  "garlic powder": "garlic",
  "rice noodles": "rice",
  "canned tomatoes": "tomatoes",
};
const SIMILAR: Record<string, string> = {
  "greek yogurt": "sour cream",
  "sour cream": "greek yogurt",
  parsley: "cilantro",
  cilantro: "parsley",
  "green onions": "leeks",
  leeks: "green onions",
  lemons: "limes",
  limes: "lemons",
  zucchini: "cucumber",
  cucumber: "zucchini",
  spinach: "kale",
  kale: "spinach",
  mozzarella: "feta",
  "heavy cream": "milk",
  jalapenos: "green bell pepper",
  "sweet potatoes": "potatoes",
  sugar: "salt",
  flour: "powdered sugar",
  basil: "mint",
  mint: "basil",
  ricotta: "cottage cheese",
  "cream cheese": "sour cream",
  hummus: "greek yogurt",
};
/** Mundane items commonly hallucinated in fridges/pantries. */
const MUNDANE_FP = [
  "soy sauce",
  "butter",
  "milk",
  "lemons",
  "ketchup",
  "mustard",
  "garlic",
  "eggs",
  "cheddar cheese",
  "olive oil",
];
const SALIENT_FP = ["chicken breast", "bacon", "salmon", "ground beef", "shrimp", "parmesan"];

const lower = (t: TruthItem) => t.name.toLowerCase();
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const has = (k: Kitchen, name: string) => k.truth.some((t) => lower(t) === name);

function base(k: Kitchen) {
  return k.truth.map((t) => ({ name: t.name, quantity: t.qty ?? "" }));
}

function replaceFirst(
  k: Kitchen,
  table: Record<string, string>,
  cls: ErrorClass,
): SimDetection | null {
  const d = base(k);
  const idx = d.findIndex((i) => table[i.name.toLowerCase()] !== undefined);
  if (idx === -1) return null;
  const truth = d[idx]!.name;
  const detected = table[truth.toLowerCase()]!;
  d[idx] = { name: detected, quantity: d[idx]!.quantity };
  return { detected: d, injected: [{ cls, truth, detected }] };
}

function addAbsent(k: Kitchen, pool: string[], n: number, cls: ErrorClass): SimDetection | null {
  const add = pool.filter((x) => !has(k, x)).slice(hash(k.id) % 3, (hash(k.id) % 3) + n);
  if (add.length < n) return null;
  return {
    detected: [...base(k), ...add.map((name) => ({ name, quantity: "" }))],
    injected: add.map((detected) => ({ cls, detected })),
  };
}

export function inject(k: Kitchen, cls: ErrorClass): SimDetection | null {
  const d = base(k);
  const pick = hash(k.id + cls) % Math.max(1, d.length);
  switch (cls) {
    case "A":
      return { detected: d, injected: [] };
    case "B": {
      if (d.length < 2) return null;
      const [gone] = d.splice(pick, 1);
      return { detected: d, injected: [{ cls, truth: gone!.name }] };
    }
    case "C": {
      if (d.length < 4) return null;
      const n = Math.max(2, Math.round(d.length * 0.3));
      const gone = d.splice(pick % (d.length - n + 1), n);
      return { detected: d, injected: gone.map((g) => ({ cls, truth: g.name })) };
    }
    case "D":
      return addAbsent(k, MUNDANE_FP, 1, cls);
    case "E":
      return addAbsent(k, MUNDANE_FP, 3, cls);
    case "F": {
      const t = d[pick]!;
      const dup = t.name.endsWith("s") ? t.name.slice(0, -1) : `${t.name}s`;
      return {
        detected: [
          ...d,
          { name: t.name.toUpperCase(), quantity: "" },
          { name: dup, quantity: "" },
          { name: `${t.name} (another pack)`, quantity: "" },
        ],
        injected: [
          {
            cls,
            truth: t.name,
            detected: `${t.name.toUpperCase()}, ${dup}, ${t.name} (another pack)`,
          },
        ],
      };
    }
    case "G":
      return replaceFirst(k, SYNONYMS, cls);
    case "H":
      return replaceFirst(k, BRANDS, cls);
    case "I":
      return replaceFirst(k, AMBIGUOUS, cls);
    case "J": {
      const idx = k.truth.findIndex((t) => t.qty && /^\d+$/.test(t.qty));
      if (idx === -1) return null;
      const truthQty = Number(k.truth[idx]!.qty);
      const wrong = String(Math.max(truthQty * 4, 12));
      d[idx] = { name: d[idx]!.name, quantity: wrong };
      return {
        detected: d,
        injected: [{ cls, truth: `${k.truth[idx]!.name} ×${truthQty}`, detected: `×${wrong}` }],
      };
    }
    case "K":
      return { detected: [], injected: [{ cls, note: "nothing detected" }] };
    case "L":
      return replaceFirst(k, CONFIDENT_WRONG, cls);
    case "M":
      return addAbsent(k, SALIENT_FP, 1, cls);
    case "N":
      return replaceFirst(k, PACKAGED_PARENT, cls);
    case "O":
      return replaceFirst(k, SIMILAR, cls);
  }
}
