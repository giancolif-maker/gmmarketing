// Real-model evaluation: runs the production AI pipeline (same prompts, parsing,
// retries and code verification as the app) on real photos / typed lists and writes an
// evidence report. See eval/README.md.
//
//   LOVABLE_API_KEY=... npm run eval
//
// This command FAILS (non-zero exit) when it can't do real work: no key, key rejected,
// gateway unreachable, or no real cases. It never reports success on placeholder data.
import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import {
  checkGateway,
  detectFromImages,
  generateVerifiedRecipes,
  MODEL,
  type Attempt,
} from "../src/lib/pantry/ai-pipeline.server";
import { parseTypedIngredients, sameIngredient } from "../src/lib/pantry/ingredients";
import {
  recipesRequestSchema,
  type Ingredient,
  type Recipe,
  type RecipesRequest,
} from "../src/lib/pantry/schemas";
import { prepareEvalImage } from "./images";
import {
  auditRecipe,
  median,
  parseExpected,
  pct,
  percentile,
  scoreDetection,
  type ClaimAudit,
  type DetectionScore,
  type ExpectedItem,
} from "./scoring";

const CASES_DIR = path.resolve(process.env["EVAL_DIR"] ?? path.join(__dirname, "cases"));
const OUT_ROOT = path.resolve(process.env["EVAL_OUT"] ?? path.join(__dirname, "results"));
const PHOTO = /\.(jpe?g|png|webp|heic|heif)$/i;

const DEFAULT_REQUEST: Omit<RecipesRequest, "scanId" | "ingredients"> = {
  servings: 2,
  maxMinutes: "30",
  mealType: "Dinner",
  diet: "None",
  highProtein: false,
  spicy: false,
  kidFriendly: false,
  cuisine: "Any",
  note: "",
};

type RecipeRun = {
  input: "scan" | "typed";
  inventory: Ingredient[];
  ok: boolean;
  code: string | null;
  ms: number;
  attempts: number;
  trace: Attempt[];
  recipes: Array<{ recipe: Recipe; audit: ClaimAudit }>;
};

type CaseResult = {
  id: string;
  notes: string;
  request: Omit<RecipesRequest, "scanId" | "ingredients">;
  photos: Array<{
    file: string;
    ok: boolean;
    error?: string;
    width?: number;
    height?: number;
    kbIn?: number;
    kbOut?: number;
  }>;
  expected: ExpectedItem[] | null;
  detection: null | {
    ok: boolean;
    code: string | null;
    ms: number;
    attempts: number;
    trace: Attempt[];
    ingredients: Ingredient[];
    score: DetectionScore | null;
  };
  runs: RecipeRun[];
  totalMs: number;
  problems: string[];
};

function readIf(dir: string, name: string) {
  const p = path.join(dir, name);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
}

function loadRequest(dir: string, problems: string[]) {
  const raw = readIf(dir, "request.json");
  if (!raw) return DEFAULT_REQUEST;
  try {
    const merged = { ...DEFAULT_REQUEST, ...JSON.parse(raw) };
    const parsed = recipesRequestSchema.safeParse({
      ...merged,
      scanId: "00000000-0000-4000-8000-000000000000",
      ingredients: [{ name: "x", quantity: "" }],
    });
    if (parsed.success) {
      const { scanId: _s, ingredients: _i, ...request } = parsed.data;
      return request;
    }
    problems.push("request.json is invalid — defaults used");
  } catch {
    problems.push("request.json is not valid JSON — defaults used");
  }
  return DEFAULT_REQUEST;
}

async function runRecipes(
  input: "scan" | "typed",
  inventory: Ingredient[],
  request: CaseResult["request"],
  truth: string[] | null,
): Promise<RecipeRun> {
  const r = await generateVerifiedRecipes(
    { scanId: "00000000-0000-4000-8000-000000000000", ingredients: inventory, ...request },
    undefined,
  );
  return {
    input,
    inventory,
    ok: r.ok,
    code: r.ok ? null : r.code,
    ms: r.ms,
    attempts: r.attempts,
    trace: r.trace,
    recipes: r.ok ? r.recipes.map((recipe) => ({ recipe, audit: auditRecipe(recipe, truth) })) : [],
  };
}

async function runCase(dir: string, id: string): Promise<CaseResult> {
  const started = Date.now();
  const problems: string[] = [];
  const files = fs.readdirSync(dir).sort();
  const photoFiles = files.filter((f) => PHOTO.test(f)).slice(0, 3);
  if (files.filter((f) => PHOTO.test(f)).length > 3)
    problems.push("more than 3 photos — only the first 3 used (app limit)");
  const expectedText = readIf(dir, "expected.txt");
  const expected = expectedText === null ? null : parseExpected(expectedText);
  if (expectedText !== null && expected === null)
    problems.push("expected.txt still contains PLACEHOLDER text");
  const typedText = readIf(dir, "typed.txt");
  const request = loadRequest(dir, problems);
  const truth = expected ? expected.map((e) => e.name) : null;
  const result: CaseResult = {
    id,
    notes: (readIf(dir, "notes.md") ?? "").trim(),
    request,
    photos: [],
    expected,
    detection: null,
    runs: [],
    totalMs: 0,
    problems,
  };

  if (photoFiles.length) {
    if (!expected)
      problems.push("photo case without a usable expected.txt — accuracy can't be scored");
    const images: string[] = [];
    for (const file of photoFiles) {
      try {
        const img = await prepareEvalImage(path.join(dir, file));
        images.push(img.dataUrl);
        result.photos.push({
          file,
          ok: true,
          width: img.width,
          height: img.height,
          kbIn: Math.round(img.bytesIn / 1024),
          kbOut: Math.round(img.bytesOut / 1024),
        });
      } catch (e) {
        result.photos.push({ file, ok: false, error: String(e) });
        problems.push(`photo ${file} could not be prepared (${String(e)}) — export it as JPEG`);
      }
    }
    if (images.length) {
      const d = await detectFromImages(images, undefined);
      const ingredients = d.ok ? d.ingredients : [];
      result.detection = {
        ok: d.ok,
        code: d.ok ? null : d.code,
        ms: d.ms,
        attempts: d.attempts,
        trace: d.trace,
        ingredients,
        score: expected ? scoreDetection(ingredients, expected) : null,
      };
      if (!d.ok) problems.push(`detection failed: ${d.code}`);
      const sc = result.detection.score;
      if (sc && (sc.falseNegatives.length || sc.falsePositives.length)) {
        problems.push(
          `detection missed ${sc.falseNegatives.length}/${sc.expected} expected (${sc.falseNegatives.map((f) => f.name).join(", ") || "—"}) and wrongly detected ${sc.falsePositives.length} (${sc.falsePositives.join(", ") || "—"})`,
        );
      } else if (!ingredients.length) problems.push("zero ingredients detected");
      if (d.attempts > 1) problems.push(`detection needed ${d.attempts} attempts`);
      // absent.txt: items the tester confirmed are NOT in the kitchen but a model might "see"
      const absentText = readIf(dir, "absent.txt");
      const absent = absentText === null ? null : parseExpected(absentText);
      if (absentText !== null && absent === null)
        problems.push("absent.txt still contains PLACEHOLDER text");
      const seenAbsent = (absent ?? [])
        .filter((a) => ingredients.some((i) => sameIngredient(i.name, a.name)))
        .map((a) => a.name);
      if (seenAbsent.length)
        problems.push(
          `detected ${seenAbsent.length} item(s) listed in absent.txt as NOT present: ${seenAbsent.join(", ")}`,
        );
      // Worst case on purpose: the tester taps "Confirm all" without fixing anything, so
      // every detected item (right or wrong) counts as confirmed.
      if (ingredients.length)
        result.runs.push(
          await runRecipes(
            "scan",
            ingredients.map((i) => ({ ...i, confirmed: true })),
            request,
            truth,
          ),
        );
    }
  }
  if (typedText !== null) {
    if (typedText.includes("PLACEHOLDER"))
      problems.push("typed.txt still contains PLACEHOLDER text");
    else {
      const inventory = parseTypedIngredients(typedText);
      if (!inventory.length) problems.push("typed.txt produced no ingredients");
      else
        result.runs.push(
          await runRecipes("typed", inventory, request, truth ?? inventory.map((i) => i.name)),
        );
    }
  }
  for (const run of result.runs) {
    if (!run.ok) problems.push(`${run.input} recipes failed: ${run.code}`);
    if (run.attempts > 1) problems.push(`${run.input} recipes needed ${run.attempts} attempts`);
    for (const { recipe, audit } of run.recipes) {
      if (audit.falseEverythingOnHand) {
        problems.push(
          `FALSE "Everything on hand" (${run.input}): "${recipe.name}" — not actually in the kitchen: ${audit.wronglyHave.join(", ")}`,
        );
      } else if (audit.wronglyHave.length) {
        problems.push(
          `${run.input}: "${recipe.name}" marks as on hand but not in ground truth: ${audit.wronglyHave.join(", ")}`,
        );
      }
    }
  }
  if (!photoFiles.length && typedText === null)
    problems.push("case has neither photos nor typed.txt");
  result.totalMs = Date.now() - started;
  return result;
}

// ---------------------------------------------------------------------------- report

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const list = (items: string[]) => (items.length ? items.map(esc).join(", ") : "—");
const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function claimText(r: Recipe) {
  if (r.everythingOnHand) return "Everything on your confirmed list";
  if (r.missing.length) return `Need: ${r.missing.join(", ")}`;
  if (r.unconfirmed.length) return `Check you have: ${r.unconfirmed.join(", ")}`;
  return "Check amounts";
}

function renderReport(
  results: CaseResult[],
  meta: { model: string; gatewayMs: number; started: string },
) {
  const L: string[] = [];
  const photoCases = results.filter((r) => r.detection);
  const scored = photoCases.filter((r) => r.detection?.score);
  const sum = (f: (s: DetectionScore) => number) =>
    scored.reduce((a, r) => a + f(r.detection!.score!), 0);
  const det = sum((s) => s.detected),
    exp = sum((s) => s.expected),
    tp = sum((s) => s.truePositives),
    stp = sum((s) => s.strictTruePositives);
  const fp = sum((s) => s.falsePositives.length),
    fn = sum((s) => s.falseNegatives.length);
  const hardE = sum((s) => s.hardExpected),
    hardF = sum((s) => s.hardFound);
  const zero = photoCases.filter(
    (r) => !r.detection!.ok || r.detection!.ingredients.length === 0,
  ).length;
  const runs = results.flatMap((r) => r.runs.map((run) => ({ case: r, run })));
  const finalRecipes = runs.flatMap((x) => x.run.recipes);
  const rejected = runs.flatMap((x) => x.run.trace.flatMap((t) => t.rejected ?? []));
  const claims = finalRecipes.filter((x) => x.audit.claimsEverythingOnHand);
  const falseClaims = claims.filter((x) => x.audit.falseEverythingOnHand);
  const detMs = photoCases.map((r) => r.detection!.ms);
  const recMs = runs.map((x) => x.run.ms);
  const totalMs = results.map((r) => r.totalMs);
  const retries = [
    ...photoCases.map((r) => r.detection!.attempts - 1),
    ...runs.map((x) => x.run.attempts - 1),
  ].reduce((a, b) => a + b, 0);

  L.push(`# PantrySnap real-model evaluation`);
  L.push(
    `Run: ${meta.started} · model: \`${meta.model}\` · gateway check: ${meta.gatewayMs} ms · cases: ${results.length} (${photoCases.length} with photos, ${runs.filter((x) => x.run.input === "typed").length} typed runs)`,
  );
  L.push(
    `\nLatency is measured from the machine running this command to the AI gateway; the deployed app adds its own network time.`,
  );
  L.push(
    `Code verification means "consistent with the ingredient list and constraints". It says nothing about whether a person would want to eat the recipe — that is what human-eval.csv is for.`,
  );

  L.push(`\n## Problems found (${results.reduce((a, r) => a + r.problems.length, 0)})`);
  const probs = results.flatMap((r) => r.problems.map((p) => `- **${r.id}**: ${p}`));
  L.push(probs.length ? probs.join("\n") : "- none recorded");

  L.push(`\n## Vision (photo cases with ground truth: ${scored.length})`);
  L.push(`| Metric | Value |\n|---|---|`);
  L.push(`| Precision (rule-based matching) | ${pct(det ? tp / det : null)} (${tp}/${det}) |`);
  L.push(`| Recall (rule-based matching) | ${pct(exp ? tp / exp : null)} (${tp}/${exp}) |`);
  L.push(`| Precision (strict: same normalized name) | ${pct(det ? stp / det : null)} |`);
  L.push(`| Recall (strict) | ${pct(exp ? stp / exp : null)} |`);
  L.push(`| False positives (detected, not there) | ${fp} |`);
  L.push(`| False negatives (there, not detected) | ${fn} |`);
  L.push(`| "Hard" items found | ${hardF}/${hardE} (included in recall above) |`);
  L.push(
    `| Zero-detection or failed-detection rate | ${pct(photoCases.length ? zero / photoCases.length : null)} (${zero}/${photoCases.length}) |`,
  );
  L.push(
    `\nFailed detections count as zero detections: their expected items are all false negatives above.`,
  );

  L.push(`\n## Core promise: "Everything on hand" claims`);
  L.push(`| | |\n|---|---|`);
  L.push(`| Recipes shown | ${finalRecipes.length} |`);
  L.push(`| Claimed "Everything on hand" | ${claims.length} |`);
  L.push(
    `| **False "Everything on hand"** (something isn't actually in the kitchen) | **${falseClaims.length}** |`,
  );
  L.push(
    `| Items shown as "need" that were actually there | ${finalRecipes.reduce((a, x) => a + x.audit.wronglyMissing.length, 0)} |`,
  );
  L.push(
    `\nScan runs use the *uncorrected* detected list with every item treated as confirmed, i.e. a user who taps "Confirm all" without fixing mistakes (the worst case; in the app, unconfirmed scanned items never count as on hand). Ground truth is expected.txt. The check is limited to ingredients the recipe lists or that the step scanner recognises; a human must still read the steps.`,
  );

  L.push(`\n## Pipeline`);
  L.push(`| | median | p90 | max |\n|---|---|---|---|`);
  const row = (label: string, v: number[]) =>
    L.push(
      `| ${label} | ${median(v) ?? "n/a"} ms | ${percentile(v, 90) ?? "n/a"} ms | ${v.length ? Math.max(...v) : "n/a"} ms |`,
    );
  row("Detection (incl. retries)", detMs);
  row("Recipe generation (incl. retries)", recMs);
  row("Whole case", totalMs);
  L.push(
    `\nRetries: ${retries} · recipe runs: ${runs.length} (failed: ${runs.filter((x) => !x.run.ok).length}) · recipes rejected by code: ${rejected.length} · recipes shown: ${finalRecipes.length}`,
  );
  const reasons = Object.entries(
    rejected.reduce<Record<string, number>>(
      (a, r) => ({ ...a, [r.reason]: (a[r.reason] ?? 0) + 1 }),
      {},
    ),
  );
  L.push(
    `Rejection reasons: ${reasons.length ? reasons.map(([k, v]) => `${k} ×${v}`).join(", ") : "none"}`,
  );

  L.push(`\n## Cases`);
  for (const r of results) {
    L.push(`\n### ${r.id}`);
    if (r.notes) L.push(`> ${r.notes.split("\n").join("\n> ")}`);
    const req = r.request;
    L.push(
      `Request: ${req.servings} servings · ≤${req.maxMinutes} min · ${req.mealType} · diet ${req.diet}${req.highProtein ? " · high protein" : ""}${req.spicy ? " · spicy" : ""}${req.kidFriendly ? " · kid-friendly" : ""}${req.cuisine !== "Any" ? ` · ${req.cuisine}` : ""}${req.note ? ` · note "${req.note}"` : ""}`,
    );
    for (const p of r.photos)
      L.push(
        p.ok
          ? `- Photo ${p.file}: ${p.kbIn} KB → ${p.width}×${p.height}, ${p.kbOut} KB sent`
          : `- Photo ${p.file}: **FAILED** ${p.error}`,
      );
    if (r.detection) {
      const d = r.detection;
      L.push(
        `\n**Detection** — ${d.ok ? "ok" : `FAILED (${d.code})`} · ${d.ms} ms · attempts ${d.attempts}${d.trace.length ? ` (${d.trace.map((t) => `${t.outcome} ${t.ms}ms`).join(" → ")})` : ""}`,
      );
      L.push(`| | |\n|---|---|`);
      L.push(
        `| Expected | ${r.expected ? list(r.expected.map((e) => e.name + (e.hard ? " [hard]" : ""))) : "(no ground truth)"} |`,
      );
      L.push(
        `| Detected | ${list(d.ingredients.map((i) => i.name + (i.quantity ? ` (${i.quantity})` : "")))} |`,
      );
      if (d.score) {
        L.push(
          `| Missed (false negatives) | ${list(d.score.falseNegatives.map((f) => f.name + (f.hard ? " [hard]" : "")))} |`,
        );
        L.push(`| Wrongly detected (false positives) | ${list(d.score.falsePositives)} |`);
        const loose = d.score.matches.filter((m) => !m.strict);
        L.push(
          `| Non-strict matches (check these) | ${list(loose.map((m) => `${m.detected} ↔ ${m.expected}`))} |`,
        );
        L.push(`| Precision / recall | ${pct(d.score.precision)} / ${pct(d.score.recall)} |`);
      }
    }
    for (const run of r.runs) {
      L.push(
        `\n**Recipes from ${run.input === "scan" ? "detected list (uncorrected)" : "typed list"}** — ${run.ok ? "ok" : `FAILED (${run.code})`} · ${run.ms} ms · attempts ${run.attempts}`,
      );
      run.trace.forEach((t, i) => {
        L.push(
          `- Attempt ${i + 1}: ${t.outcome}, ${t.ms} ms${t.parsed !== undefined ? `, ${t.parsed} parsed` : ""}${t.detail ? `, ${t.detail}` : ""}`,
        );
        for (const rej of t.rejected ?? [])
          L.push(`  - rejected by code: "${esc(rej.name)}" — ${rej.reason}`);
      });
      for (const { recipe, audit } of run.recipes) {
        const have = audit.items.filter((i) => i.app === "have").map((i) => i.name);
        L.push(
          `\n- **${esc(recipe.name)}** — passed code verification · ${recipe.totalMinutes}${recipe.totalMinutesUpper ? `–${recipe.totalMinutesUpper}` : ""} min · ${recipe.servings} servings${recipe.servingsStated ? "" : " (servings not stated by AI)"} · shown as: **${claimText(recipe)}**${audit.falseEverythingOnHand ? " · ❌ **FALSE CLAIM**" : ""}`,
        );
        L.push(`  - On hand (per app): ${list(have)}`);
        L.push(
          `  - Missing (per app): ${list(recipe.missing)}${recipe.ingredients.some((i) => i.fromSteps) ? ` · found only in steps: ${list(recipe.ingredients.filter((i) => i.fromSteps).map((i) => i.name))}` : ""}`,
        );
        if (audit.wronglyHave.length)
          L.push(`  - ❌ Shown as on hand but NOT in ground truth: ${list(audit.wronglyHave)}`);
        if (audit.wronglyMissing.length)
          L.push(
            `  - ⚠️ Shown as needed but actually in the kitchen: ${list(audit.wronglyMissing)}`,
          );
      }
    }
  }
  return L.join("\n") + "\n";
}

function renderRecipesForReview(results: CaseResult[]) {
  const L = [
    "# Recipes for human review",
    "",
    "Read each recipe in full, then fill in human-eval.csv. Judge the recipe, not the formatting.",
    "",
  ];
  let n = 0;
  for (const r of results)
    for (const run of r.runs)
      for (const { recipe } of run.recipes) {
        n++;
        L.push(`## R${n}. ${recipe.name}  (case ${r.id}, ${run.input})`);
        L.push(
          `${recipe.totalMinutes} min · ${recipe.servings} servings · shown as: ${claimText(recipe)}`,
        );
        L.push(`\nYour ingredients (${run.input}): ${run.inventory.map((i) => i.name).join(", ")}`);
        L.push(`\nIngredients:`);
        for (const i of recipe.ingredients)
          L.push(
            `- ${i.name}${i.measurement ? ` — ${i.measurement}` : ""}${i.status === "missing" ? " (NEED)" : ""}${i.fromSteps ? " (only in steps)" : ""}`,
          );
        L.push(`\nSteps:`);
        recipe.steps.forEach((s, i) => L.push(`${i + 1}. ${s}`));
        L.push("");
      }
  return L.join("\n");
}

function renderHumanEvalCsv(results: CaseResult[]) {
  const header = [
    "recipe_id",
    "case",
    "input",
    "recipe",
    "minutes",
    "servings",
    "shown_as",
    "code_false_claim",
    "evaluator",
    "would_make_tonight (YES/MAYBE/NO)",
    "looks_realistic (YES/NO)",
    "correctly_uses_what_you_have (YES/NO)",
    "anything_wrong (free text)",
    "vs_chatgpt (BETTER/SAME/WORSE)",
    "notes",
  ];
  const rows = [header.map(csv).join(",")];
  let n = 0;
  for (const r of results)
    for (const run of r.runs)
      for (const { recipe, audit } of run.recipes) {
        n++;
        rows.push(
          [
            `R${n}`,
            r.id,
            run.input,
            recipe.name,
            recipe.totalMinutes,
            recipe.servings,
            claimText(recipe),
            audit.falseEverythingOnHand ? "YES" : "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
          ]
            .map(csv)
            .join(","),
        );
      }
  return rows.join("\n") + "\n";
}

// ---------------------------------------------------------------------------- run

it(`real-model evaluation (${MODEL})`, { timeout: 60 * 60 * 1000 }, async () => {
  const started = new Date().toISOString();
  if (!process.env["LOVABLE_API_KEY"]) {
    throw new Error(
      "BLOCKED: LOVABLE_API_KEY is not set. Export it in your shell (never commit it) and re-run `npm run eval`.",
    );
  }
  const gateway = await checkGateway();
  if (!gateway.ok) {
    throw new Error(
      `BLOCKED: AI gateway check failed (${gateway.code}: ${gateway.detail}). A 401 means the key was rejected.`,
    );
  }

  const caseDirs = fs.existsSync(CASES_DIR)
    ? fs
        .readdirSync(CASES_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !/^[_.]/.test(d.name))
        .map((d) => d.name)
        .sort()
    : [];
  if (!caseDirs.length) {
    throw new Error(
      `No real cases found in ${CASES_DIR}. Folders starting with "_" are templates and are ignored — copy one, add your photo and expected.txt (see eval/README.md).`,
    );
  }

  const results: CaseResult[] = [];
  for (const id of caseDirs) {
    console.log(`[eval] ${id} …`);
    results.push(await runCase(path.join(CASES_DIR, id), id));
  }

  const outDir = path.join(OUT_ROOT, started.replace(/[:.]/g, "-"));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "report.md"),
    renderReport(results, { model: MODEL, gatewayMs: gateway.ms, started }),
  );
  fs.writeFileSync(path.join(outDir, "recipes-for-review.md"), renderRecipesForReview(results));
  fs.writeFileSync(path.join(outDir, "human-eval.csv"), renderHumanEvalCsv(results));
  fs.writeFileSync(
    path.join(outDir, "results.json"),
    JSON.stringify({ started, model: MODEL, cases: results }, null, 2),
  );
  console.log(
    `\n[eval] Report written to ${outDir}\n  report.md · recipes-for-review.md · human-eval.csv · results.json`,
  );

  // The command succeeds when the evaluation ran — the report, not the exit code, says how well the model did.
  expect(results.length).toBeGreaterThan(0);
});
