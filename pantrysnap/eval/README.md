# Real-model evaluation

Runs the **production AI pipeline** — same prompts, parsing, retries, timeouts and
code verification as the app — on your own photos and typed lists, and writes an
evidence report. No Supabase, no browser, no app server needed.

```sh
export LOVABLE_API_KEY=…   # in your shell only — never commit it or paste it anywhere
npm run eval
```

- Exit code **1** means the evaluation could not run (no key, key rejected, gateway
  unreachable, or no real cases). The message starts with `BLOCKED` or explains what is missing.
- Exit code **0** means it ran. **It does not mean the model did well** — read the report.
- Each run costs real AI calls: per case one detection call (+1 on retry) and one recipe call
  per input (+1 on retry), plus one tiny check call per run.

Optional: `EVAL_DIR=/path/to/cases` (default `eval/cases`), `EVAL_OUT=/path` (default `eval/results`).

## Adding cases

One folder per case inside `eval/cases/`. Folders starting with `_` are templates and are
ignored. To add a case, copy a template, rename it (drop the `_todo-` prefix), and fill it in:

```
eval/cases/
  fridge-monday/
    photo.jpg          # 1–3 photos (jpg/png/webp; export HEIC as JPEG). Any size — resized like the app does.
    expected.txt       # REQUIRED for photo cases: what is actually there (ground truth)
    typed.txt          # optional: what a person would type for the same kitchen
    notes.md           # optional: what's visible, lighting, anything unusual (copied into the report)
    request.json       # optional: constraints (defaults below)
```

**expected.txt** — one ingredient per line, generic names, everything a person could cook with:

```
eggs
cheddar cheese
spinach
greek yogurt
leftover rice [hard]     # [hard] = partly hidden/hard to see. Still counts toward recall.
# lines starting with # are ignored
```

Write it by looking at the real fridge, not at the photo alone, and write it **before** you
look at what the model detected. Don't drop items because they are hard to see — mark them
`[hard]` instead. Files still containing the word `PLACEHOLDER` are refused.

**typed.txt** — exactly what a user might type (commas or one per line, amounts optional).
A folder with only `typed.txt` is a typed-only case.

**request.json** — defaults if omitted:

```json
{
  "servings": 2,
  "maxMinutes": "30",
  "mealType": "Dinner",
  "diet": "None",
  "highProtein": false,
  "spicy": false,
  "kidFriendly": false,
  "cuisine": "Any",
  "note": ""
}
```

`maxMinutes`: `"15" | "30" | "45" | "60+"` · `diet`: `None | Vegetarian | Vegan | Gluten-free` ·
`cuisine`: `Any | American | Italian | Mexican | Asian | Indian | Mediterranean`.
Use the same request when you run the ChatGPT comparison (see CHATGPT_COMPARISON.md).

### The dataset we need (templates provided)

`_todo-01-normal-fridge` · `_todo-02-crowded-fridge` · `_todo-03-pantry` · `_todo-04-countertop` ·
`_todo-05-leftovers` · `_todo-06-partially-obscured` · `_todo-07-packaged-food` ·
`_todo-08-similar-ingredients` · `_todo-09-few-ingredients` · `_todo-10-many-ingredients`.
Aim for at least 2–3 real photos per type, from different kitchens. `_example-typed-weeknight`
is developer-written example input, not real data.

Photos and results are git-ignored so they stay on your machine.

## Output — `eval/results/<timestamp>/`

| File                    | What it is                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `report.md`             | The evidence. Starts with **Problems found** — every failure, retry, miss, false detection and false claim. |
| `recipes-for-review.md` | Every recipe shown, in full, for people to read.                                                            |
| `human-eval.csv`        | One row per recipe to be filled in by people (see HUMAN_EVAL.md).                                           |
| `results.json`          | Everything, machine-readable (detections, every attempt, every recipe, audits).                             |

## What is measured

**Vision** (photo cases with `expected.txt`)

- Precision = detected items that are really there ÷ all detected items.
- Recall = expected items that were detected ÷ all expected items.
- Matching is one-to-one. "Strict" counts only identical normalized names; "rule-based"
  also accepts the app's synonym/category rules (e.g. scallion = green onion, cheddar counts
  as "cheese"). Both are reported; non-strict matches are listed per photo for you to check.
- False positives / false negatives listed per photo; `[hard]` items broken out but never excluded.
- Zero-detection rate: photos where detection failed or found nothing. Failed detections count
  as zero recall — they are not dropped.

**Core promise** — every recipe shown as **"Everything on hand"** is re-checked against
`expected.txt`. If any ingredient isn't really in the kitchen, it is a **false claim** and is
listed at the top. Scan runs deliberately use the _uncorrected_ detected list with every item
treated as confirmed (a user who taps "Confirm all" without fixing mistakes — the worst case;
in the app, scanned items the user hasn't confirmed never count as on hand). The app now shows
this claim as "Everything on your confirmed list". Also reported: items shown as "need" that were actually there.

**Pipeline** — detection, recipe and whole-case latency (median / p90 / max, including
retries); every attempt with its outcome and time; every recipe rejected by code with its
reason; number of recipes shown.

**Not measured by code:** whether a recipe is good, realistic or something anyone would cook.
That is what `human-eval.csv` and the user test are for. A recipe that "passed code
verification" is only consistent with the ingredient list and constraints.

## Known limits of the automatic checks

- Step scanning recognises ~200 common ingredients; an unusual ingredient mentioned only in
  the steps can slip past. Humans reading `recipes-for-review.md` should look for this.
- Amounts are only compared for plain counts ("4 eggs"), not cups/grams.
- Latency is measured from this machine to the gateway, not through the deployed app.
