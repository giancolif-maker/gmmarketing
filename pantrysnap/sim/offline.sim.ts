// ADVERSARIAL SIMULATION — offline part. Drives the REAL product code (normalization, typed
// parsing, matching, verification) with synthetic kitchens, labelled synthetic vision errors
// and a list-faithful simulated recipe model. Nothing here measures real AI accuracy or
// real human behaviour.
import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { covers, normalizeIngredients, parseTypedIngredients } from "../src/lib/pantry/ingredients";
import {
  parseExclusions,
  plainCount,
  validateRecipes,
  verifyRecipe,
  type Constraints,
} from "../src/lib/pantry/recipe-validation";
import type { Ingredient, Recipe } from "../src/lib/pantry/schemas";
import { auditRecipe, parseExpected, scoreDetection } from "../eval/scoring";
import { simulateRecipes } from "./ai";
import { ATTACKS, MATCH_PAIRS, type Attack } from "./attacks";
import { KITCHENS, type Kitchen } from "./kitchens";
import { PERSONAS } from "./personas";
import { ERROR_CLASSES, inject, type ErrorClass } from "./vision";

const OUT = path.join(__dirname, "results");
const L: string[] = [];
const data: Record<string, unknown> = {};

const constraints = (inventory: Ingredient[], over: Partial<Constraints> = {}): Constraints => ({
  inventory,
  servings: 2,
  maxMinutes: "30",
  diet: "None",
  highProtein: false,
  spicy: false,
  kidFriendly: false,
  exclusions: [],
  ...over,
});
const truthList = (k: Kitchen) =>
  normalizeIngredients(k.truth.map((t) => ({ name: t.name, quantity: t.qty ?? "" })));

/** Rename-type errors where the item really IS there under another name (synonym, brand, duplicate, vague). */
const SAME_ITEM_CLASSES = new Set(["F", "G", "H", "I"]);

/** Ground truth for auditing; for same-item renames the alias refers to the real item. */
function auditTruth(
  k: Kitchen,
  injected: Array<{ cls: string; truth?: string; detected?: string }> = [],
) {
  const names = k.truth.map((t) => t.name);
  for (const i of injected)
    if (SAME_ITEM_CLASSES.has(i.cls) && i.detected)
      names.push(...i.detected.split(",").map((x) => x.trim()));
  return names;
}

/** "Everything on hand" is false if an item isn't really there OR a plain count exceeds the real amount. */
function falseClaims(recipe: Recipe, k: Kitchen, truthNames = k.truth.map((t) => t.name)) {
  if (!recipe.everythingOnHand) return [];
  const audit = auditRecipe(recipe, truthNames);
  const reasons = audit.wronglyHave.map((n) => `not in kitchen: ${n}`);
  for (const i of recipe.ingredients) {
    const need = plainCount(i.measurement);
    const t = k.truth.find((t) => covers(t.name, i.name));
    const have = t?.qty && /^\d+$/.test(t.qty) ? Number(t.qty) : null;
    if (need !== null && have !== null && need > have)
      reasons.push(`amount: needs ${need} ${i.name}, kitchen has ${have}`);
  }
  return reasons;
}

// ---------------------------------------------------------------------------- 1. trust experiment
function trustExperiment() {
  type Row = {
    runs: number;
    na: number;
    shown: number;
    eoh: number;
    falseEoh: number;
    usingWrong: number;
    usingWrongEoh: number;
    onlyWrong: number;
    onlyWrongEoh: number;
    wronglyMissing: number;
    noRecipes: number;
    fallback: number;
    edits: number[];
    examples: string[];
  };
  // "left unconfirmed": user fixes nothing and confirms nothing (scanned items stay unconfirmed);
  // "confirmed unchecked": user taps "Confirm all" without fixing anything (worst case);
  // "fully corrected": user fixes the list to ground truth.
  const policies = ["left unconfirmed", "confirmed unchecked", "fully corrected"] as const;
  const POLICY_LABEL: Record<(typeof policies)[number], string> = {
    "left unconfirmed": "(unconfirmed)",
    "confirmed unchecked": "(confirm all)",
    "fully corrected": "(fixed)",
  };
  const table: Record<string, Record<string, Row>> = {};
  for (const cls of Object.keys(ERROR_CLASSES) as ErrorClass[]) {
    table[cls] = {};
    for (const pol of policies)
      table[cls][pol] = {
        runs: 0,
        na: 0,
        shown: 0,
        eoh: 0,
        falseEoh: 0,
        usingWrong: 0,
        usingWrongEoh: 0,
        onlyWrong: 0,
        onlyWrongEoh: 0,
        wronglyMissing: 0,
        noRecipes: 0,
        fallback: 0,
        edits: [],
        examples: [],
      };
    for (const k of KITCHENS) {
      const det = inject(k, cls);
      for (const pol of policies) {
        const row = table[cls][pol]!;
        if (!det) {
          row.na++;
          continue;
        }
        row.runs++;
        const detected = normalizeIngredients(det.detected);
        const truth = truthList(k);
        if (pol === "confirmed unchecked")
          row.edits.push(
            (() => {
              const s = scoreDetection(
                detected,
                parseExpected(k.truth.map((t) => t.name).join("\n"))!,
              );
              return s.falsePositives.length + s.falseNegatives.length;
            })(),
          );
        if (pol !== "fully corrected" && detected.length === 0) {
          row.fallback++;
          continue;
        } // app forces the typed fallback
        const confirmed =
          pol === "fully corrected"
            ? truth
            : pol === "left unconfirmed"
              ? detected.map((i) => ({ ...i, confirmed: false }))
              : detected;
        const focus =
          det.injected
            .find((i) => i.detected)
            ?.detected?.split(",")[0]
            ?.trim() ?? null;
        const alias = cls === "H" || cls === "G" ? det.injected[0] : undefined;
        const genericFor =
          alias?.detected && alias.truth ? { alias: alias.detected, generic: alias.truth } : null;
        const truthNames = auditTruth(k, det.injected);
        const { recipes } = validateRecipes(
          simulateRecipes(confirmed, focus, undefined, genericFor),
          constraints(confirmed),
        );
        if (!recipes.length) row.noRecipes++;
        for (const r of recipes) {
          row.shown++;
          if (r.everythingOnHand) row.eoh++;
          const bad = falseClaims(r, k, truthNames);
          const wrongItems = auditRecipe(r, truthNames).wronglyHave;
          if (wrongItems.length) {
            row.usingWrong++;
            if (r.everythingOnHand) row.usingWrongEoh++;
            // nothing else genuinely missing: the wrong item is the only thing between "need" and "have"
            if (!r.ingredients.some((i) => i.status === "missing" || i.short)) {
              row.onlyWrong++;
              if (r.everythingOnHand) row.onlyWrongEoh++;
            }
          }
          if (bad.length) {
            row.falseEoh++;
            if (row.examples.length < 4)
              row.examples.push(
                `${k.id} (${k.archetype}): injected ${det.injected.map((i) => `${i.truth ?? "∅"}→${i.detected ?? "∅"}`).join("; ")} · "${r.name}" shown "Everything on hand" · ${bad.join("; ")}`,
              );
          }
          row.wronglyMissing += auditRecipe(r, truthNames).wronglyMissing.length;
        }
      }
    }
  }
  data["trust"] = table;
  L.push(`## 1. Trust experiment — vision error class × correction`);
  L.push(
    `52 synthetic kitchens × 15 injected error classes. The simulated recipe model only uses the list it is given (like the real prompt). Three review policies: "unconfirmed" = user fixes and confirms nothing (scanned items stay marked unconfirmed); "confirm all" = user taps "Confirm all" without fixing anything (worst case); "fixed" = user fixes the list to ground truth. These are bounds, not predictions of real user behaviour.\n`,
  );
  L.push(
    `Recipe 1 of each run deliberately uses the injected item (worst case), so the absolute counts reflect the design. The meaningful figure is the **conditional** one: of the recipes that used an item that isn't really there, how many were still shown as "Everything on hand".\n`,
  );
  L.push(
    `| Class | Error | Applicable | Recipes shown | "Everything on hand" | **False "Everything on hand"** | Recipes using a non-existent item → shown "Everything on hand" | …where nothing else was missing | Shown as need but actually there | No recipes | Forced typed fallback | Median edits to fix list |`,
  );
  L.push(`|---|---|---|---|---|---|---|---|---|---|---|---|`);
  for (const [cls, label] of Object.entries(ERROR_CLASSES)) {
    for (const pol of policies) {
      const r = table[cls]![pol]!;
      const med = r.edits.length
        ? [...r.edits].sort((a, b) => a - b)[Math.floor(r.edits.length / 2)]
        : "";
      L.push(
        `| ${cls} ${POLICY_LABEL[pol]} | ${pol === "left unconfirmed" ? label : "…same error"} | ${r.runs}/${r.runs + r.na} | ${r.shown} | ${r.eoh} | **${r.falseEoh}** | ${r.usingWrong ? `${r.usingWrongEoh}/${r.usingWrong}` : "—"} | ${r.onlyWrong ? `**${r.onlyWrongEoh}/${r.onlyWrong}**` : "—"} | ${r.wronglyMissing} | ${r.noRecipes} | ${r.fallback} | ${med} |`,
      );
    }
  }
  const total = (pol: (typeof policies)[number]) =>
    Object.values(table).reduce((a, r) => a + r[pol]!.falseEoh, 0);
  L.push(
    `\nFalse "Everything on your confirmed list" when scanned items are left unconfirmed: **${total("left unconfirmed")}**`,
  );
  L.push(`\n**False-claim examples (confirm all without checking):**`);
  for (const [cls] of Object.entries(ERROR_CLASSES))
    for (const ex of table[cls]!["confirmed unchecked"]!.examples.slice(0, 2))
      L.push(`- ${cls}: ${ex}`);
  const fixed = Object.values(table).reduce((a, r) => a + r["fully corrected"]!.falseEoh, 0);
  L.push(
    `\nFalse "Everything on hand" after full correction (verifier/matcher self-consistency): **${fixed}**`,
  );
  for (const [cls] of Object.entries(ERROR_CLASSES))
    for (const ex of table[cls]!["fully corrected"]!.examples) L.push(`- ${cls} (fixed): ${ex}`);
}

// ---------------------------------------------------------------------------- 2. attacks
function runAttack(a: Attack) {
  const inventory = normalizeIngredients(
    a.inventory.map((s) => {
      const [name, qty] = s.split("|");
      return { name: name!, quantity: qty ?? "" };
    }),
  );
  const c = constraints(inventory, {
    maxMinutes: a.maxMinutes ?? "30",
    diet: a.diet ?? "None",
    highProtein: !!a.highProtein,
    spicy: !!a.spicy,
    kidFriendly: !!a.kidFriendly,
    exclusions: parseExclusions(a.note ?? ""),
  });
  const raw = {
    name: `Attack ${a.id}`,
    description: "",
    whyItFits: "",
    servings: 2,
    prepMinutes: 5,
    cookMinutes: 10,
    substitutes: [],
    ...a.recipe,
  };
  const r = verifyRecipe(raw, c);
  const problems: string[] = [];
  if (a.safe.reject && r.ok) problems.push("accepted (should be rejected)");
  if (r.ok) {
    if (a.safe.notEverythingOnHand && r.recipe.everythingOnHand)
      problems.push('shown "Everything on hand"');
    for (const m of a.safe.missingIncludes ?? [])
      if (!r.recipe.missing.some((x) => x.toLowerCase().includes(m)))
        problems.push(`"${m}" not reported missing`);
  }
  const outcome = r.ok
    ? `accepted · ${r.recipe.everythingOnHand ? "Everything on your confirmed list" : `need: ${r.recipe.missing.join(", ") || "(amount check)"}`} · ${r.recipe.totalMinutes}${r.recipe.totalMinutesUpper ? `–${r.recipe.totalMinutesUpper}` : ""} min`
    : `rejected: ${r.reason}`;
  return { a, outcome, problems, exclusions: c.exclusions.map((e) => e.label) };
}

function attacks() {
  const results = ATTACKS.map(runAttack);
  data["attacks"] = results.map((r) => ({
    id: r.a.id,
    attack: r.a.attack,
    outcome: r.outcome,
    problems: r.problems,
  }));
  for (const area of ["verification", "constraints", "hostile"] as const) {
    const rows = results.filter((r) => r.a.area === area);
    const missed = rows.filter((r) => r.problems.length);
    L.push(
      `\n## ${area === "verification" ? "2" : area === "constraints" ? "3" : "4"}. ${area === "verification" ? "Recipe-verification attacks" : area === "constraints" ? "Constraint-bypass attacks" : "Hostile inputs (must fail safe)"} — ${rows.length - missed.length}/${rows.length} handled safely`,
    );
    L.push(`| ID | Attack | Product outcome | Result |\n|---|---|---|---|`);
    for (const r of rows)
      L.push(
        `| ${r.a.id} | ${r.a.attack}${r.exclusions.length ? ` (parsed exclusions: ${r.exclusions.join(", ")})` : r.a.note ? " (parsed exclusions: none)" : ""} | ${r.outcome} | ${r.problems.length ? `❌ ${r.problems.join("; ")}` : "✅ safe"} |`,
      );
  }
}

// ---------------------------------------------------------------------------- 3. matching
function matching() {
  const rows = MATCH_PAIRS.map(([inv, rec, expect]) => ({
    inv,
    rec,
    expect,
    got: covers(inv, rec),
  }));
  const wrong = rows.filter(
    (r) => (r.expect === "must" && !r.got) || (r.expect === "must-not" && r.got),
  );
  const dangerous = wrong.filter((r) => r.expect === "must-not");
  data["matching"] = { total: rows.length, wrong };
  L.push(
    `\n## 5. Ingredient-matching matrix — ${rows.length} directional pairs ("does the inventory item satisfy the recipe ingredient?")`,
  );
  L.push(
    `- must match: ${rows.filter((r) => r.expect === "must").length}, missed: **${wrong.filter((r) => r.expect === "must").length}** (safe direction: causes a false "need")`,
  );
  L.push(
    `- must NOT match: ${rows.filter((r) => r.expect === "must-not").length}, wrongly matched: **${dangerous.length}** (dangerous: can create a false "Everything on hand")`,
  );
  for (const r of wrong)
    L.push(
      `  - ${r.expect === "must-not" ? "❌ DANGEROUS" : "⚠️ missed"}: inventory "${r.inv}" ${r.got ? "satisfies" : "does not satisfy"} recipe "${r.rec}"`,
    );
  L.push(
    `- debatable pairs (not scored): ${rows
      .filter((r) => r.expect === "either")
      .map((r) => `${r.inv}→${r.rec}: ${r.got ? "match" : "no"}`)
      .join("; ")}`,
  );
}

// ---------------------------------------------------------------------------- 4. scan vs type effort
function effort() {
  L.push(`\n## 6. Scan vs type — structural effort accounting (counts, not timings)`);
  L.push(
    `Typing effort = characters to type the whole inventory. Scan effort = in-app taps (4) + native camera taps (2) + chips to review + corrections (each false positive = 1 tap; each false negative = typing its name; each wrong name = retype). No human speed data exists here; the crossover depends on it.`,
  );
  const sizes = KITCHENS.map((k) => k.truth.length);
  const rows = KITCHENS.map((k) => {
    const chars = k.truth.map((t) => t.name).join(", ").length;
    const perRow: Record<string, string> = {};
    for (const cls of ["A", "B", "C", "E", "O"] as ErrorClass[]) {
      const det = inject(k, cls);
      if (!det) {
        perRow[cls] = "n/a";
        continue;
      }
      const s = scoreDetection(
        normalizeIngredients(det.detected),
        parseExpected(k.truth.map((t) => t.name).join("\n"))!,
      );
      const typedFix = s.falseNegatives.reduce((a, f) => a + f.name.length + 1, 0);
      perRow[cls] =
        `${det.detected.length} chips, ${s.falsePositives.length} del, ${typedFix} chars`;
    }
    return { k, chars, perRow };
  });
  const small = rows.filter((r) => r.k.truth.length <= 6);
  const large = rows.filter((r) => r.k.truth.length >= 15);
  L.push(
    `- Inventory size across kitchens: min ${Math.min(...sizes)}, median ${[...sizes].sort((a, b) => a - b)[26]}, max ${Math.max(...sizes)} items.`,
  );
  L.push(
    `- Small kitchens (≤6 items, n=${small.length}): typing the whole list = ${Math.min(...small.map((r) => r.chars))}–${Math.max(...small.map((r) => r.chars))} characters. Scanning still costs 6 taps + a review, plus typing anything missed.`,
  );
  L.push(
    `- Large kitchens (≥15 items, n=${large.length}): typing = ${Math.min(...large.map((r) => r.chars))}–${Math.max(...large.map((r) => r.chars))} characters. With multiple false negatives (class C) the scan path still requires typing ${large.map((r) => r.perRow["C"]).join(" | ")}.`,
  );
  L.push(
    `\n| Kitchen | Items | Type-all chars | Perfect scan (A) | 1 miss (B) | ~30% missed (C) | 3 false pos (E) | look-alike (O) |\n|---|---|---|---|---|---|---|---|`,
  );
  for (const r of rows.filter(
    (x, i) => i % 4 === 0 || x.k.truth.length >= 15 || x.k.truth.length <= 4,
  )) {
    L.push(
      `| ${r.k.id} ${r.k.archetype} | ${r.k.truth.length} | ${r.chars} | ${r.perRow["A"]} | ${r.perRow["B"]} | ${r.perRow["C"]} | ${r.perRow["E"]} | ${r.perRow["O"]} |`,
    );
  }
}

// ---------------------------------------------------------------------------- 5. personas
function personas() {
  L.push(`\n## 7. Persona journeys (SIMULATED — rule-based personas, not people)`);
  L.push(
    `Each persona's review behaviour and typed list are assumptions written in sim/personas.ts. Outcomes come from running the real product functions on those assumptions.\n`,
  );
  L.push(
    `| # | Persona | Scan: vision error assumed → review | Scan outcome | Type: what they type | Type outcome | Friction (rule-flagged) | Recurring trigger |\n|---|---|---|---|---|---|---|---|`,
  );
  const out = [];
  for (const pa of PERSONAS) {
    const k = KITCHENS.find((x) => x.id === pa.kitchen)!;
    const det = inject(k, pa.scanError) ?? inject(k, "A")!;
    const detected = normalizeIngredients(det.detected);
    const truth = truthList(k);
    const s = scoreDetection(detected, parseExpected(k.truth.map((t) => t.name).join("\n"))!);
    // careful: fixes the list; skims: removes salient wrong proteins, then "Confirm all";
    // none: moves on without touching the list (scanned items stay unconfirmed).
    const confirmed =
      pa.review === "careful"
        ? truth
        : pa.review === "skims"
          ? detected.filter(
              (d) =>
                !s.falsePositives.includes(d.name) ||
                !/chicken|beef|salmon|bacon|shrimp|pork|tofu/.test(d.name),
            )
          : detected.map((d) => ({ ...d, confirmed: false }));
    const { note, ...prefs } = pa.prefs;
    const c = (inv: Ingredient[]) =>
      constraints(inv, { ...prefs, exclusions: parseExclusions(note ?? "") });
    const focus = det.injected.find((i) => i.detected)?.detected ?? null;
    const req = {
      maxMinutes: Number((prefs.maxMinutes ?? "30").replace("+", "")) || 30,
      servings: prefs.servings ?? 2,
    };
    const scan = confirmed.length
      ? validateRecipes(simulateRecipes(confirmed, focus, req), c(confirmed)).recipes
      : [];
    const typedInv = parseTypedIngredients(pa.typed);
    const typed = typedInv.length
      ? validateRecipes(simulateRecipes(typedInv, null, req), c(typedInv)).recipes
      : [];
    const scanFalse = scan.filter(
      (r) => falseClaims(r, k, auditTruth(k, det.injected)).length,
    ).length;
    const typedNeedButHave = typed.reduce(
      (a, r) =>
        a +
        auditRecipe(
          r,
          k.truth.map((t) => t.name),
        ).wronglyMissing.length,
      0,
    );
    const friction: string[] = [];
    const edits = s.falsePositives.length + s.falseNegatives.length;
    if (!detected.length) friction.push("scan found nothing → forced to type anyway");
    if (pa.review === "careful" && edits >= 3) friction.push(`${edits} edits to fix the scan`);
    if (pa.review !== "careful" && edits > 0)
      friction.push(`${edits} list errors left in (review: ${pa.review})`);
    if (detected.length > 15)
      friction.push(
        `review screen has ${detected.length} chips (long scroll before "Find recipes")`,
      );
    if (!scan.length) friction.push("scan path: no recipes");
    if (!typed.length) friction.push("type path: no recipes");
    if (pa.typed.length > 150) friction.push(`typing ${pa.typed.length} chars`);
    if (!pa.knowsInventory) friction.push("type path requires going to look in the fridge first");
    if (typedNeedButHave)
      friction.push(`type path: ${typedNeedButHave} "need" items they actually have (not typed)`);
    for (const f of pa.unsupported) friction.push(`unsupported: ${f}`);
    out.push({ id: pa.id, friction, scanFalse, scan: scan.length, typed: typed.length });
    L.push(
      `| ${pa.id} | ${pa.label} | ${ERROR_CLASSES[pa.scanError]} → ${pa.review} | ${scan.length} recipes, ${scan.filter((r) => r.everythingOnHand).length} "everything", ${scanFalse ? `**${scanFalse} FALSE**` : "0 false"} | ${pa.typed.length > 40 ? pa.typed.slice(0, 40) + "…" : pa.typed} | ${typed.length} recipes, ${typed.filter((r) => r.everythingOnHand).length} "everything" | ${friction.join("; ") || "—"} | ${pa.retention.category}: ${pa.retention.reason} |`,
    );
  }
  data["personas"] = out;
}

it("offline adversarial simulation", () => {
  L.push(
    `# PantrySnap adversarial simulation — offline part\nGenerated ${new Date().toISOString()}. SYNTHETIC data only. Real product functions; simulated vision errors, simulated recipe model, simulated personas.\n`,
  );
  trustExperiment();
  attacks();
  matching();
  effort();
  personas();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "offline.md"), L.join("\n") + "\n");
  fs.writeFileSync(path.join(OUT, "offline.json"), JSON.stringify(data, null, 2));
  expect(KITCHENS.length).toBeGreaterThanOrEqual(50);
});
