# Human evaluation of recipes

Code can check that a recipe is consistent with the ingredient list. It cannot tell whether
a person would want to cook it. These judgments must come from people and must not be
automated or filled in by an AI.

## How

1. After `npm run eval`, open `eval/results/<timestamp>/recipes-for-review.md` and
   `human-eval.csv` (a blank version is in `templates/human-eval.csv`).
2. Ideally the person whose kitchen it is evaluates their own case. Otherwise, someone who
   cooks regularly.
3. Read the full recipe (ingredients **and** steps) before answering.
4. Fill one row per recipe. Leave the pre-filled columns alone. Put your name/initials in `evaluator`.
5. Don't discuss with other evaluators until everyone is done.

## Questions (answer exactly one option)

| Column                         | Question                                                                                                       | Answers               |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- | --------------------- |
| `would_make_tonight`           | Would you actually make this tonight?                                                                          | YES / MAYBE / NO      |
| `looks_realistic`              | Does this look like a realistic recipe that would work?                                                        | YES / NO              |
| `correctly_uses_what_you_have` | Does it correctly use what you have (nothing assumed that isn't there, nothing obvious ignored)?               | YES / NO              |
| `anything_wrong`               | Did you notice anything wrong? (wrong times, missing steps, ingredient only in the steps, odd amounts, unsafe) | free text             |
| `vs_chatgpt`                   | Compared with what ChatGPT gave you for the same photo and request (see CHATGPT_COMPARISON.md)                 | BETTER / SAME / WORSE |

`code_false_claim = YES` means the evaluation already found this "Everything on your confirmed list" (formerly "Everything on hand") claim
to be false. Answer the questions anyway.

## Summarising (by hand)

Report counts, not averages of opinions: e.g. "11 of 32 recipes: would make tonight = YES;
6 = MAYBE; 15 = NO". Quote the free-text problems verbatim.
