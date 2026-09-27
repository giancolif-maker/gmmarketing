// SIMULATED personas. Every behaviour below (which vision error they hit, how carefully they
// review, what they would type, why they might return) is an explicit ASSUMPTION written for
// stress-testing the flow. None of it is user research.
import type { Diet, TimeOption } from "../src/lib/pantry/schemas";
import type { ErrorClass } from "./vision";

export type Persona = {
  id: number;
  label: string;
  kitchen: string;
  scanError: ErrorClass;
  review: "careful" | "skims" | "none";
  knowsInventory: boolean;
  typed: string;
  prefs: {
    maxMinutes?: TimeOption;
    diet?: Diet;
    highProtein?: boolean;
    spicy?: boolean;
    kidFriendly?: boolean;
    servings?: number;
    note?: string;
  };
  unsupported: string[];
  retention: {
    category:
      "strong recurring trigger" | "weak recurring trigger" | "one-time novelty" | "unclear";
    reason: string;
  };
};

export const PERSONAS: Persona[] = [
  {
    id: 1,
    label: "No idea what's in the fridge",
    kitchen: "k03",
    scanError: "C",
    review: "skims",
    knowsInventory: false,
    typed: "chicken, eggs, spinach",
    prefs: {},
    unsupported: [],
    retention: {
      category: "weak recurring trigger",
      reason:
        "the need recurs, but every visit costs a full re-scan and review (nothing remembered)",
    },
  },
  {
    id: 2,
    label: "Knows exactly what they want",
    kitchen: "k12",
    scanError: "A",
    review: "careful",
    knowsInventory: true,
    typed: "spaghetti, canned tomatoes, garlic, parmesan",
    prefs: {},
    unsupported: ["asking for one specific dish (no 'make me X' input)"],
    retention: {
      category: "one-time novelty",
      reason: "already has a plan; the app adds a step between them and cooking",
    },
  },
  {
    id: 3,
    label: "Only three ingredients",
    kitchen: "k20",
    scanError: "D",
    review: "careful",
    knowsInventory: true,
    typed: "pasta, butter, parmesan",
    prefs: {},
    unsupported: [],
    retention: {
      category: "unclear",
      reason: "useful on 'empty fridge' nights; unclear how often those nights occur",
    },
  },
  {
    id: 4,
    label: "Has 25+ ingredients",
    kitchen: "k31",
    scanError: "C",
    review: "careful",
    knowsInventory: false,
    typed:
      "chicken breast, ground beef, salmon, rice, pasta, eggs, milk, butter, cheddar cheese, spinach, broccoli, carrots, onions, garlic, potatoes, apples, bananas, bread, yogurt, tomatoes, lettuce, bell peppers",
    prefs: {},
    unsupported: [],
    retention: {
      category: "weak recurring trigger",
      reason:
        "post-shopping 'what do I do with all this' recurs weekly, but the list isn't kept between visits",
    },
  },
  {
    id: 5,
    label: "Hates typing",
    kitchen: "k02",
    scanError: "B",
    review: "none",
    knowsInventory: true,
    typed: "chicken, broccoli, cheese",
    prefs: {},
    unsupported: [],
    retention: {
      category: "weak recurring trigger",
      reason: "scan is the only path they tolerate; returns only if scans are reliably right",
    },
  },
  {
    id: 6,
    label: "Hates taking photos",
    kitchen: "k45",
    scanError: "A",
    review: "careful",
    knowsInventory: true,
    typed: "chicken breast, rice, carrots, peas, butter, milk, cheddar cheese",
    prefs: {},
    unsupported: [],
    retention: {
      category: "unclear",
      reason:
        "for them the product is 'typed list → verified recipes', i.e. close to a chat assistant plus checks",
    },
  },
  {
    id: 7,
    label: "In a hurry",
    kitchen: "k09",
    scanError: "D",
    review: "none",
    knowsInventory: true,
    typed: "eggs, bread, bacon",
    prefs: { maxMinutes: "15" },
    unsupported: [],
    retention: {
      category: "weak recurring trigger",
      reason:
        "time-pressed nights recur, but two AI waits + a review screen compete with just making toast",
    },
  },
  {
    id: 8,
    label: "Cares about high protein",
    kitchen: "k07",
    scanError: "M",
    review: "skims",
    knowsInventory: true,
    typed: "chicken breast, eggs, greek yogurt, rice, broccoli",
    prefs: { highProtein: true },
    unsupported: ["protein grams / macros (only 'has a protein source' is checked)"],
    retention: {
      category: "weak recurring trigger",
      reason: "daily protein goal is a real recurring need, but the app can't quantify protein",
    },
  },
  {
    id: 9,
    label: "Cooks for a family",
    kitchen: "k29",
    scanError: "B",
    review: "careful",
    knowsInventory: true,
    typed: "chicken nuggets, macaroni, cheddar cheese, milk, carrots, apples",
    prefs: { servings: 4, kidFriendly: true },
    unsupported: ["per-person dislikes / picky eaters beyond one free-text note"],
    retention: {
      category: "strong recurring trigger",
      reason:
        "nightly 'what's for dinner' for several people is a genuine daily trigger — if results are good",
    },
  },
  {
    id: 10,
    label: "Only wants recipes they can make right now",
    kitchen: "k05",
    scanError: "N",
    review: "none",
    knowsInventory: true,
    typed: "rice, pasta, canned tomatoes, chickpeas, black beans, onions, garlic, potatoes, tuna",
    prefs: {},
    unsupported: [],
    retention: {
      category: "unclear",
      reason:
        "depends entirely on 'Everything on hand' being true; one false claim likely ends trust",
    },
  },
  {
    id: 11,
    label: "Doesn't trust AI",
    kitchen: "k02",
    scanError: "L",
    review: "careful",
    knowsInventory: true,
    typed: "chicken breast, broccoli, cheddar cheese, eggs",
    prefs: {},
    unsupported: [],
    retention: {
      category: "unclear",
      reason: "the visible checks may help or they may never get past the first wrong detection",
    },
  },
  {
    id: 12,
    label: "Doesn't want to review ingredients",
    kitchen: "k16",
    scanError: "F",
    review: "none",
    knowsInventory: true,
    typed: "eggs, cheese, chicken",
    prefs: {},
    unsupported: ["skipping review (the list is always shown before recipes)"],
    retention: {
      category: "weak recurring trigger",
      reason: "review is mandatory; skipping it is exactly what exposes them to false claims",
    },
  },
  {
    id: 13,
    label: "Mainly cooks from leftovers",
    kitchen: "k08",
    scanError: "I",
    review: "skims",
    knowsInventory: true,
    typed: "leftover rice, roast chicken, tortillas, cheddar cheese",
    prefs: {},
    unsupported: ["telling the app food is already cooked (no 'leftover' handling)"],
    retention: {
      category: "strong recurring trigger",
      reason: "leftovers appear after most cooking; a natural 'use it up' trigger",
    },
  },
  {
    id: 14,
    label: "Uses lots of packaged foods",
    kitchen: "k17",
    scanError: "H",
    review: "skims",
    knowsInventory: true,
    typed: "cream cheese, bagels, greek yogurt, peanut butter",
    prefs: {},
    unsupported: ["brand names → ingredients"],
    retention: {
      category: "unclear",
      reason: "brands are exactly where detection naming is weakest",
    },
  },
  {
    id: 15,
    label: "Often missing ingredients",
    kitchen: "k01",
    scanError: "B",
    review: "careful",
    knowsInventory: true,
    typed: "eggs, butter",
    prefs: {},
    unsupported: ["shopping list / 'what to buy' (not built)"],
    retention: {
      category: "weak recurring trigger",
      reason: "the frequent answer will be 'need 2–3 things', which is what any recipe site says",
    },
  },
  {
    id: 16,
    label: "Mostly wants inspiration",
    kitchen: "k11",
    scanError: "A",
    review: "none",
    knowsInventory: true,
    typed: "rice, tofu, bok choy, eggs",
    prefs: { note: "something new I haven't made" },
    unsupported: [
      "conversational follow-up ('something different', 'make it spicier') without regenerating",
      "no photos/ratings to browse",
    ],
    retention: {
      category: "one-time novelty",
      reason: "inspiration is better served by feeds with photos; 4 text cards per try",
    },
  },
  {
    id: 17,
    label: "Already uses ChatGPT for this",
    kitchen: "k06",
    scanError: "B",
    review: "careful",
    knowsInventory: true,
    typed: "tofu, chickpeas, spinach, sweet potatoes, quinoa",
    prefs: { diet: "Vegetarian" },
    unsupported: ["follow-up questions / substitutions dialogue"],
    retention: {
      category: "unclear",
      reason: "must beat a free tool they already use; only edge is the verified 'need' list",
    },
  },
  {
    id: 18,
    label: "Rarely cooks",
    kitchen: "k04",
    scanError: "H",
    review: "none",
    knowsInventory: false,
    typed: "instant ramen, eggs, cheese",
    prefs: {},
    unsupported: [],
    retention: { category: "one-time novelty", reason: "no recurring cooking habit to attach to" },
  },
  {
    id: 19,
    label: "Cooks every night",
    kitchen: "k31",
    scanError: "E",
    review: "careful",
    knowsInventory: true,
    typed: "chicken breast, salmon, rice, spinach, garlic, onions",
    prefs: {},
    unsupported: ["remembering the kitchen between nights (re-scan/retype every time)"],
    retention: {
      category: "strong recurring trigger",
      reason: "daily need — but re-entering the kitchen daily is the structural cost",
    },
  },
  {
    id: 20,
    label: "Wants very simple recipes",
    kitchen: "k23",
    scanError: "D",
    review: "skims",
    knowsInventory: true,
    typed: "bread, peanut butter, bananas, eggs",
    prefs: { maxMinutes: "15", note: "very simple, few ingredients" },
    unsupported: ["'simple' is not verified (only time is)"],
    retention: {
      category: "weak recurring trigger",
      reason: "simple meals are often already known without an app",
    },
  },
];
