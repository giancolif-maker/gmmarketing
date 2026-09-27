// Pure scoring for the real-model evaluation. Kept separate (and unit-tested) so the
// numbers in the report can be trusted. Principles:
//   * one-to-one matching: one detected "cheese" can't count as finding three cheeses
//   * strict (same normalized name) and rule-based (synonym/category) matches are reported
//     separately, so lenient matching can't quietly inflate the score
//   * "hard" items stay in the denominator — they are only broken out, never excluded
import { covers, ingredientKey, isStaple, sameIngredient } from "../src/lib/pantry/ingredients";
import type { Ingredient, Recipe } from "../src/lib/pantry/schemas";

export type ExpectedItem = { name: string; hard: boolean };

/** Marker used in template files; cases still containing it are skipped and reported. */
export const PLACEHOLDER = "PLACEHOLDER";

/** One ingredient per line. "#" starts a comment. Append "[hard]" to mark a difficult item. */
export function parseExpected(text: string): ExpectedItem[] | null {
  if (text.includes(PLACEHOLDER)) return null;
  const seen = new Set<string>();
  const out: ExpectedItem[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const hard = /\[hard\]/i.test(line);
    const name = line
      .replace(/\[hard\]/gi, "")
      .trim()
      .toLowerCase();
    if (!name) continue;
    const key = ingredientKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, hard });
  }
  return out;
}

export type DetectionScore = {
  expected: number;
  detected: number;
  /** Detected items matched one-to-one to an expected item (strict + rule-based). */
  truePositives: number;
  strictTruePositives: number;
  matches: Array<{ detected: string; expected: string; strict: boolean }>;
  falsePositives: string[];
  falseNegatives: Array<{ name: string; hard: boolean }>;
  precision: number | null;
  recall: number | null;
  strictPrecision: number | null;
  strictRecall: number | null;
  hardExpected: number;
  hardFound: number;
};

export function scoreDetection(detected: Ingredient[], expected: ExpectedItem[]): DetectionScore {
  const usedD = new Set<number>();
  const usedE = new Set<number>();
  const matches: DetectionScore["matches"] = [];
  const pass = (strict: boolean) => {
    expected.forEach((e, ei) => {
      if (usedE.has(ei)) return;
      const di = detected.findIndex(
        (d, i) =>
          !usedD.has(i) &&
          (strict
            ? ingredientKey(d.name) === ingredientKey(e.name)
            : sameIngredient(d.name, e.name)),
      );
      if (di === -1) return;
      usedD.add(di);
      usedE.add(ei);
      matches.push({ detected: detected[di]!.name, expected: e.name, strict });
    });
  };
  pass(true);
  pass(false);
  const tp = matches.length;
  const strictTp = matches.filter((m) => m.strict).length;
  const ratio = (n: number, d: number) => (d === 0 ? null : n / d);
  const hard = expected.filter((e) => e.hard);
  return {
    expected: expected.length,
    detected: detected.length,
    truePositives: tp,
    strictTruePositives: strictTp,
    matches,
    falsePositives: detected.filter((_, i) => !usedD.has(i)).map((d) => d.name),
    falseNegatives: expected.filter((_, i) => !usedE.has(i)),
    precision: ratio(tp, detected.length),
    recall: ratio(tp, expected.length),
    strictPrecision: ratio(strictTp, detected.length),
    strictRecall: ratio(strictTp, expected.length),
    hardExpected: hard.length,
    hardFound: hard.filter((h) => matches.some((m) => m.expected === h.name)).length,
  };
}

export type ClaimAudit = {
  claimsEverythingOnHand: boolean;
  items: Array<{
    name: string;
    fromSteps: boolean;
    /** What the app computed from the list it was given. */
    app: "have" | "missing" | "staple";
    /** What is actually in the kitchen according to the ground truth (null if none given). */
    truth: "have" | "missing" | "staple" | null;
  }>;
  /** App said "have" but the ground truth doesn't contain it. */
  wronglyHave: string[];
  /** App said "missing" but the ground truth contains it (usually a missed detection). */
  wronglyMissing: string[];
  /** The serious failure: "Everything on hand" shown, but something isn't actually there. */
  falseEverythingOnHand: boolean;
};

/** Re-checks a recipe's availability claims against the case's ground truth. */
export function auditRecipe(recipe: Recipe, groundTruth: string[] | null): ClaimAudit {
  const items = recipe.ingredients.map((i) => {
    const truth: ClaimAudit["items"][number]["truth"] = !groundTruth
      ? null
      : isStaple(i.name)
        ? "staple"
        : groundTruth.some((g) => covers(g, i.name))
          ? "have"
          : "missing";
    return { name: i.name, fromSteps: i.fromSteps, app: i.status, truth };
  });
  const wronglyHave = items
    .filter((i) => i.app === "have" && i.truth === "missing")
    .map((i) => i.name);
  const wronglyMissing = items
    .filter((i) => i.app === "missing" && i.truth === "have")
    .map((i) => i.name);
  return {
    claimsEverythingOnHand: recipe.everythingOnHand,
    items,
    wronglyHave,
    wronglyMissing,
    falseEverythingOnHand: recipe.everythingOnHand && wronglyHave.length > 0,
  };
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2);
}

export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]!;
}

export const pct = (v: number | null) => (v === null ? "n/a" : `${Math.round(v * 100)}%`);
