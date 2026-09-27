// Runs the production AI pipeline (same prompts, parsing, retries and verification as the
// app) against real photos and typed lists, and writes eval/report.md.
//
//   LOVABLE_API_KEY=... npm run eval                 # uses eval/cases
//   LOVABLE_API_KEY=... EVAL_DIR=~/fridge-photos npm run eval
//
// Case files (any mix):
//   <name>.jpg            photo (JPEG, ≤ ~1.1 MB — export at ~1280px; the app does this automatically)
//   <name>.expected.txt   optional ground truth for that photo: one ingredient per line
//   <name>.typed.txt      a typed ingredient list (goes through the typed-input parser)
//   <name>.note.txt       optional "Anything else?" request for that case
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import { detectFromImages, generateVerifiedRecipes, MODEL } from "@/lib/pantry/ai-pipeline.server";
import { sanitizeJpegDataUrl } from "@/lib/pantry/image-validation";
import { parseTypedIngredients, sameIngredient } from "@/lib/pantry/ingredients";
import type { Ingredient, RecipesRequest } from "@/lib/pantry/schemas";

const dir = process.env["EVAL_DIR"] ?? path.join(__dirname, "cases");
const hasKey = !!process.env["LOVABLE_API_KEY"];
const lines: string[] = [];
const out = (s = "") => lines.push(s);

function score(detected: Ingredient[], expected: string[]) {
  const hit = expected.filter((e) => detected.some((d) => sameIngredient(d.name, e)));
  const extra = detected.filter((d) => !expected.some((e) => sameIngredient(d.name, e)));
  return {
    recall: expected.length ? hit.length / expected.length : null,
    precision: detected.length ? (detected.length - extra.length) / detected.length : null,
    missed: expected.filter((e) => !hit.includes(e)),
    extra: extra.map((d) => d.name),
  };
}

async function recipesFor(label: string, ingredients: Ingredient[], note: string) {
  const request: RecipesRequest = {
    scanId: "00000000-0000-4000-8000-000000000000",
    ingredients,
    servings: 2,
    maxMinutes: "30",
    mealType: "Dinner",
    diet: "None",
    highProtein: false,
    spicy: false,
    kidFriendly: false,
    cuisine: "Any",
    note,
  };
  const r = await generateVerifiedRecipes(request, undefined);
  out(
    `**Recipes** (${r.ms} ms, ${r.attempts} attempt(s), rejected: ${r.rejected.join(", ") || "none"})`,
  );
  if (!r.ok) return out(`- FAILED: ${r.code}`);
  for (const x of r.recipes) {
    const status = x.everythingOnHand
      ? "everything on hand"
      : `need ${x.missing.join(", ") || "(check amounts)"}`;
    const hidden = x.ingredients.filter((i) => i.fromSteps).map((i) => i.name);
    out(
      `- **${x.name}** — ${x.totalMinutes}${x.totalMinutesUpper ? `–${x.totalMinutesUpper}` : ""} min, ${x.matchPercent}% on hand, ${status}` +
        (hidden.length ? ` · step-only: ${hidden.join(", ")}` : "") +
        (x.servingsStated ? "" : " · servings not stated"),
    );
  }
  void label;
}

describe.skipIf(!hasKey)(`real model (${MODEL})`, () => {
  it("runs every case", async () => {
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).sort() : [];
    const read = (f: string) =>
      fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), "utf8") : "";
    out(`# Real-model evaluation — ${new Date().toISOString()}`);
    out(`Model: ${MODEL} · cases: ${dir}`);
    const recalls: number[] = [];
    const precisions: number[] = [];

    for (const file of files.filter((f) => /\.jpe?g$/i.test(f))) {
      const base = file.replace(/\.jpe?g$/i, "");
      out(`\n## Photo: ${file}`);
      const bytes = fs.readFileSync(path.join(dir, file));
      const clean = sanitizeJpegDataUrl(`data:image/jpeg;base64,${bytes.toString("base64")}`);
      if (!clean || clean.length > 1_500_000) {
        out(`- SKIPPED: not a JPEG or larger than ~1.1 MB (resize to ~1280px first)`);
        continue;
      }
      const d = await detectFromImages([clean], undefined);
      if (!d.ok) {
        out(`- Detection FAILED: ${d.code} (${d.ms} ms)`);
        continue;
      }
      out(
        `**Detected** (${d.ms} ms, ${d.attempts} attempt(s)): ${d.ingredients.map((i) => i.name).join(", ") || "(none)"}`,
      );
      const expected = read(`${base}.expected.txt`)
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (expected.length) {
        const s = score(d.ingredients, expected);
        if (s.recall !== null) recalls.push(s.recall);
        if (s.precision !== null) precisions.push(s.precision);
        out(
          `Recall ${(100 * (s.recall ?? 0)).toFixed(0)}% · precision ${(100 * (s.precision ?? 0)).toFixed(0)}%`,
        );
        out(
          `Missed: ${s.missed.join(", ") || "—"} · Not in ground truth: ${s.extra.join(", ") || "—"}`,
        );
      }
      if (d.ingredients.length)
        await recipesFor(base, d.ingredients, read(`${base}.note.txt`).trim());
    }

    for (const file of files.filter((f) => f.endsWith(".typed.txt"))) {
      const base = file.replace(/\.typed\.txt$/, "");
      out(`\n## Typed: ${file}`);
      const ingredients = parseTypedIngredients(read(file));
      out(
        `**Parsed**: ${ingredients.map((i) => i.name + (i.quantity ? ` (${i.quantity})` : "")).join(", ")}`,
      );
      if (ingredients.length) await recipesFor(base, ingredients, read(`${base}.note.txt`).trim());
    }

    const avg = (a: number[]) =>
      a.length ? `${((100 * a.reduce((x, y) => x + y, 0)) / a.length).toFixed(0)}%` : "n/a";
    out(
      `\n## Summary\nMean detection recall ${avg(recalls)} · mean precision ${avg(precisions)} (over ${recalls.length} labelled photo(s))`,
    );
    fs.writeFileSync(path.join(__dirname, "report.md"), lines.join("\n") + "\n");
    console.log(lines.join("\n"));
  });
});

describe.skipIf(hasKey)("real model", () => {
  it.skip("BLOCKED: set LOVABLE_API_KEY to run the real-model evaluation", () => {});
});
