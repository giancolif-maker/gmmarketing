# PantrySnap vs ChatGPT — manual comparison protocol

The question: for the same kitchen and the same request, which one gets a person to a meal
they would actually cook, with less effort and fewer surprises? No automatic winner — this
records evidence. Record results in `templates/chatgpt-comparison.csv`.

## Setup (same for both)

- **Same photo(s)** — the exact files, taken once, before either tool is used.
- **Same request** — write it down first, e.g. _2 servings, max 30 minutes, dinner,
  vegetarian, "something crispy"_. Use it verbatim in both tools.
- **Same person, same device.** Alternate which tool goes first between participants
  (odd participants: PantrySnap first; even: ChatGPT first).
- ChatGPT: a fresh chat, the model available to a normal user, no custom instructions.
  Attach the photo(s) and paste this prompt, filling in the brackets:

  > Here is a photo of my [fridge/pantry/counter]. Suggest recipes I can make with what I have.
  > [2] servings, at most [30] minutes, [dinner], diet: [none]. [Extra request, if any.]
  > Tell me which ingredients I'd be missing.

- PantrySnap: Scan → review → set the same constraints → Find recipes.

## What to record (per tool)

| Field                           | How                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `time_to_first_usable_recipe_s` | Stopwatch from starting the tool to the moment the person says "I'd cook this one". If never, write NONE.           |
| `corrections`                   | Number of edits the person made (PantrySnap: ingredient fixes; ChatGPT: follow-up messages to correct or redirect). |
| `looks_cookable`                | YES/NO — does the chosen recipe look like it would work?                                                            |
| `missing_ingredients_claimed`   | What the tool said they'd need.                                                                                     |
| `missing_ingredients_actual`    | Check the kitchen: what they'd actually need. Note any false "you have everything".                                 |
| `would_cook_it`                 | YES/MAYBE/NO                                                                                                        |
| `preferred`                     | Asked at the end: "If you did this again tomorrow, which would you use?" PANTRYSNAP / CHATGPT / NO PREFERENCE       |
| `why`                           | Their words, verbatim.                                                                                              |

## Rules

- Don't help the participant with either tool beyond "go ahead".
- Don't tell them which one you built.
- If a tool errors, record it and let them retry once; the time keeps running.
- Report every comparison, including ones where PantrySnap lost.
