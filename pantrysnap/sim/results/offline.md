# PantrySnap adversarial simulation — offline part
Generated 2026-09-27T16:41:38.918Z. SYNTHETIC data only. Real product functions; simulated vision errors, simulated recipe model, simulated personas.

## 1. Trust experiment — vision error class × correction
52 synthetic kitchens × 15 injected error classes. The simulated recipe model only uses the list it is given (like the real prompt). Three review policies: "unconfirmed" = user fixes and confirms nothing (scanned items stay marked unconfirmed); "confirm all" = user taps "Confirm all" without fixing anything (worst case); "fixed" = user fixes the list to ground truth. These are bounds, not predictions of real user behaviour.

Recipe 1 of each run deliberately uses the injected item (worst case), so the absolute counts reflect the design. The meaningful figure is the **conditional** one: of the recipes that used an item that isn't really there, how many were still shown as "Everything on hand".

| Class | Error | Applicable | Recipes shown | "Everything on hand" | **False "Everything on hand"** | Recipes using a non-existent item → shown "Everything on hand" | …where nothing else was missing | Shown as need but actually there | No recipes | Forced typed fallback | Median edits to fix list |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A (unconfirmed) | perfect detection | 52/52 | 104 | 0 | **0** | — | — | 0 | 0 | 0 |  |
| A (confirm all) | …same error | 52/52 | 104 | 52 | **0** | — | — | 0 | 0 | 0 | 0 |
| A (fixed) | …same error | 52/52 | 104 | 52 | **0** | — | — | 0 | 0 | 0 |  |
| B (unconfirmed) | one false negative | 52/52 | 104 | 0 | **0** | — | — | 0 | 0 | 0 |  |
| B (confirm all) | …same error | 52/52 | 104 | 51 | **0** | — | — | 0 | 0 | 0 | 1 |
| B (fixed) | …same error | 52/52 | 104 | 52 | **0** | — | — | 0 | 0 | 0 |  |
| C (unconfirmed) | multiple false negatives | 50/52 | 100 | 0 | **0** | — | — | 0 | 0 | 0 |  |
| C (confirm all) | …same error | 50/52 | 100 | 50 | **0** | — | — | 0 | 0 | 0 | 3 |
| C (fixed) | …same error | 50/52 | 100 | 50 | **0** | — | — | 0 | 0 | 0 |  |
| D (unconfirmed) | one false positive (mundane item) | 52/52 | 156 | 0 | **0** | — | — | 0 | 0 | 0 |  |
| D (confirm all) | …same error | 52/52 | 156 | 104 | **52** | 52/104 | **52/52** | 0 | 0 | 0 | 1 |
| D (fixed) | …same error | 52/52 | 104 | 52 | **0** | — | — | 0 | 0 | 0 |  |
| E (unconfirmed) | multiple false positives | 51/52 | 153 | 0 | **0** | — | — | 0 | 0 | 0 |  |
| E (confirm all) | …same error | 51/52 | 153 | 102 | **51** | 51/102 | **51/51** | 0 | 0 | 0 | 3 |
| E (fixed) | …same error | 51/52 | 102 | 51 | **0** | — | — | 0 | 0 | 0 |  |
| F (unconfirmed) | duplicate detection | 52/52 | 155 | 0 | **0** | — | — | 0 | 0 | 0 |  |
| F (confirm all) | …same error | 52/52 | 155 | 103 | **0** | — | — | 0 | 0 | 0 | 0 |
| F (fixed) | …same error | 52/52 | 155 | 103 | **0** | — | — | 0 | 0 | 0 |  |
| G (unconfirmed) | synonym / regional name | 46/52 | 184 | 0 | **0** | — | — | 1 | 0 | 0 |  |
| G (confirm all) | …same error | 46/52 | 184 | 137 | **0** | — | — | 1 | 0 | 0 | 0 |
| G (fixed) | …same error | 46/52 | 92 | 46 | **0** | — | — | 0 | 0 | 0 |  |
| H (unconfirmed) | brand name instead of ingredient | 43/52 | 172 | 0 | **0** | — | — | 40 | 0 | 0 |  |
| H (confirm all) | …same error | 43/52 | 172 | 89 | **0** | — | — | 40 | 0 | 0 | 2 |
| H (fixed) | …same error | 43/52 | 86 | 43 | **0** | — | — | 0 | 0 | 0 |  |
| I (unconfirmed) | ambiguous / vague name | 30/52 | 78 | 0 | **0** | — | — | 0 | 0 | 0 |  |
| I (confirm all) | …same error | 30/52 | 78 | 48 | **0** | — | — | 0 | 0 | 0 | 2 |
| I (fixed) | …same error | 30/52 | 60 | 30 | **0** | — | — | 0 | 0 | 0 |  |
| J (unconfirmed) | quantity error | 18/52 | 36 | 0 | **0** | — | — | 0 | 0 | 0 |  |
| J (confirm all) | …same error | 18/52 | 36 | 18 | **3** | — | — | 0 | 0 | 0 | 0 |
| J (fixed) | …same error | 18/52 | 36 | 18 | **0** | — | — | 0 | 0 | 0 |  |
| K (unconfirmed) | completely empty detection | 52/52 | 0 | 0 | **0** | — | — | 0 | 0 | 52 |  |
| K (confirm all) | …same error | 52/52 | 0 | 0 | **0** | — | — | 0 | 0 | 52 | 10 |
| K (fixed) | …same error | 52/52 | 104 | 52 | **0** | — | — | 0 | 0 | 0 |  |
| L (unconfirmed) | confident but incorrect identity | 16/52 | 48 | 0 | **0** | — | — | 0 | 0 | 0 |  |
| L (confirm all) | …same error | 16/52 | 48 | 32 | **19** | 19/21 | **19/19** | 0 | 0 | 0 | 2 |
| L (fixed) | …same error | 16/52 | 35 | 19 | **0** | — | — | 0 | 0 | 0 |  |
| M (unconfirmed) | salient hallucination (protein) | 52/52 | 156 | 0 | **0** | — | — | 0 | 0 | 0 |  |
| M (confirm all) | …same error | 52/52 | 156 | 104 | **52** | 52/104 | **52/52** | 0 | 0 | 0 | 1 |
| M (fixed) | …same error | 52/52 | 104 | 52 | **0** | — | — | 0 | 0 | 0 |  |
| N (unconfirmed) | packaged item misread as its parent | 29/52 | 87 | 0 | **0** | — | — | 0 | 0 | 0 |  |
| N (confirm all) | …same error | 29/52 | 87 | 58 | **22** | 22/24 | **22/22** | 0 | 0 | 0 | 2 |
| N (fixed) | …same error | 29/52 | 61 | 32 | **0** | — | — | 0 | 0 | 0 |  |
| O (unconfirmed) | visually similar item confusion | 32/52 | 96 | 0 | **0** | — | — | 0 | 0 | 0 |  |
| O (confirm all) | …same error | 32/52 | 96 | 64 | **32** | 32/34 | **32/32** | 0 | 0 | 0 | 2 |
| O (fixed) | …same error | 32/52 | 70 | 38 | **0** | — | — | 0 | 0 | 0 |  |

False "Everything on your confirmed list" when scanned items are left unconfirmed: **0**

**False-claim examples (confirm all without checking):**
- D: k01 (nearly empty fridge): injected ∅→milk · "Skillet with milk" shown "Everything on hand" · not in kitchen: milk
- D: k02 (normal family fridge): injected ∅→ketchup · "Skillet with ketchup" shown "Everything on hand" · not in kitchen: ketchup
- E: k01 (nearly empty fridge): injected ∅→milk; ∅→lemons; ∅→mustard · "Skillet with milk" shown "Everything on hand" · not in kitchen: milk
- E: k02 (normal family fridge): injected ∅→ketchup; ∅→mustard; ∅→garlic · "Skillet with ketchup" shown "Everything on hand" · not in kitchen: ketchup
- J: k01 (nearly empty fridge): injected eggs ×2→×12 · "Quick eggs bowl" shown "Everything on hand" · amount: needs 6 eggs, kitchen has 2
- J: k04 (college fridge): injected instant ramen ×3→×12 · "Quick instant ramen bowl" shown "Everything on hand" · amount: needs 6 instant ramen, kitchen has 3
- L: k06 (vegetarian kitchen): injected tofu→chicken breast · "Skillet with chicken breast" shown "Everything on hand" · not in kitchen: chicken breast
- L: k06 (vegetarian kitchen): injected tofu→chicken breast · "Quick chicken breast bowl" shown "Everything on hand" · not in kitchen: chicken breast
- M: k01 (nearly empty fridge): injected ∅→bacon · "Skillet with bacon" shown "Everything on hand" · not in kitchen: bacon
- M: k02 (normal family fridge): injected ∅→ground beef · "Skillet with ground beef" shown "Everything on hand" · not in kitchen: ground beef
- N: k06 (vegetarian kitchen): injected coconut milk→milk · "Skillet with milk" shown "Everything on hand" · not in kitchen: milk
- N: k10 (Mexican-style set): injected chili powder→chili · "Skillet with chili" shown "Everything on hand" · not in kitchen: chili
- O: k02 (normal family fridge): injected greek yogurt→sour cream · "Skillet with sour cream" shown "Everything on hand" · not in kitchen: sour cream
- O: k05 (pantry-heavy kitchen): injected flour→powdered sugar · "Skillet with powdered sugar" shown "Everything on hand" · not in kitchen: powdered sugar

False "Everything on hand" after full correction (verifier/matcher self-consistency): **0**

## 2. Recipe-verification attacks — 17/20 handled safely
| ID | Attack | Product outcome | Result |
|---|---|---|---|
| V01 | step-only soy sauce | accepted · need: soy sauce · 15 min | ✅ safe |
| V02 | step-only butter | accepted · need: butter · 15 min | ✅ safe |
| V03 | stated 15 min, steps total 30 (no single step over limit) | rejected: time_contradiction | ✅ safe |
| V04 | stated 15 min, one step 30 min | rejected: time_contradiction | ✅ safe |
| V05 | 2 servings but 8 eggs | accepted · Everything on your confirmed list · 15 min | ❌ accepted (should be rejected) |
| V06 | AI text claims 'you have everything' but an item is missing | accepted · need: shallot · 15 min | ✅ safe |
| V07 | needs cream cheese, has cheese | accepted · need: cream cheese · 15 min | ✅ safe |
| V08 | needs coconut milk, has milk | accepted · need: coconut milk · 15 min | ✅ safe |
| V09 | needs peanut butter, has butter | accepted · need: peanut butter · 15 min | ✅ safe |
| V10 | step-only ingredient outside the vocabulary (stock) | accepted · need: stock · 15 min | ✅ safe |
| V11 | step-only mirin and hoisin (not in vocabulary) | accepted · need: mirin, hoisin · 15 min | ✅ safe |
| V12 | quantity written as '4 eggs, beaten' vs 2 listed | accepted · Everything on your confirmed list · 15 min | ❌ shown "Everything on hand" |
| V13 | quantity '4 large' vs 2 listed | accepted · need: (amount check) · 15 min | ✅ safe |
| V14 | 'Feeds a family of four' when 2 requested | accepted · Everything on your confirmed list · 15 min | ❌ accepted (should be rejected) |
| V15 | 'Serves 4' when 2 requested | rejected: servings | ✅ safe |
| V16 | 'about an hour' in a 30-min request | rejected: time_contradiction | ✅ safe |
| V17 | 'rest overnight' in a 45-min request | rejected: time_contradiction | ✅ safe |
| V18 | time written as 'twenty-five minutes' in a 15-min request | rejected: time_contradiction | ✅ safe |
| V19 | swap suggests an item the user also lacks | accepted · need: heavy cream · 15 min | ✅ safe |
| V20 | generic 'oil' on list, step uses sesame oil | accepted · need: sesame oil · 15 min | ✅ safe |

## 3. Constraint-bypass attacks — 20/20 handled safely
| ID | Attack | Product outcome | Result |
|---|---|---|---|
| C01 | no mushrooms; mushrooms only in step 5 (parsed exclusions: mushroom) | rejected: excluded | ✅ safe |
| C02 | vegetarian; bacon in step 4 | rejected: diet | ✅ safe |
| C03 | vegetarian; bacon as an OPTIONAL garnish | rejected: diet | ✅ safe |
| C04 | no dairy; cheddar hidden in a step (parsed exclusions: dairy) | rejected: excluded | ✅ safe |
| C05 | no dairy; cheddar as 'if you like' (parsed exclusions: dairy) | rejected: excluded | ✅ safe |
| C06 | high protein; no meaningful protein | rejected: not_high_protein | ✅ safe |
| C07 | high protein; only 'egg noodles' as protein evidence | rejected: not_high_protein | ✅ safe |
| C08 | 'no spicy food'; hot sauce hidden in steps (parsed exclusions: spicy) | rejected: excluded | ✅ safe |
| C09 | 'not spicy'; hot sauce hidden in steps (parsed exclusions: spicy) | rejected: excluded | ✅ safe |
| C10 | kid-friendly; chili powder in steps | rejected: too_spicy_for_kids | ✅ safe |
| C11 | vegan; ghee only in the steps | rejected: diet | ✅ safe |
| C12 | vegan; honey only in the steps | rejected: diet | ✅ safe |
| C13 | vegetarian; bare 'worcestershire' in steps | rejected: diet | ✅ safe |
| C14 | vegetarian; 'lardons' (not in meat list) | rejected: diet | ✅ safe |
| C15 | gluten-free; beer in steps | rejected: diet | ✅ safe |
| C16 | gluten-free; soy sauce in steps | rejected: diet | ✅ safe |
| C17 | nut-free; pine nuts in steps (parsed exclusions: nut) | rejected: excluded | ✅ safe |
| C18 | 'no pork'; pancetta listed (parsed exclusions: pork) | rejected: excluded | ✅ safe |
| C19 | servings=2 but AI states servings 4 | rejected: servings | ✅ safe |
| C20 | 60+ request; 5-hour braise | rejected: time_contradiction | ✅ safe |

## 4. Hostile inputs (must fail safe) — 14/15 handled safely
| ID | Attack | Product outcome | Result |
|---|---|---|---|
| H01 | vague list item 'sauce' used as an ingredient | accepted · Everything on your confirmed list · 15 min | ❌ shown "Everything on hand" |
| H02 | list item 'leftovers' used as 'leftover chicken' | accepted · need: leftover chicken · 15 min | ✅ safe |
| H03 | 'meat' on list, recipe needs chicken breast | accepted · need: chicken breast · 15 min | ✅ safe |
| H04 | brand 'Philadelphia' on list, recipe needs cream cheese | accepted · need: cream cheese · 15 min | ✅ safe |
| H05 | 'sweet potatoes' on list, recipe needs potatoes | accepted · need: potatoes · 15 min | ✅ safe |
| H06 | 'chicken nuggets' on list, recipe needs chicken | accepted · need: chicken · 15 min | ✅ safe |
| H07 | 'milk chocolate' on list, recipe needs milk | accepted · need: milk · 15 min | ✅ safe |
| H08 | 'condensed milk' on list, recipe needs milk | accepted · need: milk · 15 min | ✅ safe |
| H09 | 'egg noodles' on list, recipe needs eggs | accepted · need: eggs · 15 min | ✅ safe |
| H10 | 'green beans' on list, recipe needs black beans | accepted · need: beans · 15 min | ✅ safe |
| H11 | 'green onions' on list, recipe needs onion | accepted · need: onion · 15 min | ✅ safe |
| H12 | 'frozen yogurt' on list, recipe needs yogurt | accepted · need: yogurt · 15 min | ✅ safe |
| H13 | impossible time: 60+ request, stated 0 minutes | rejected: time | ✅ safe |
| H14 | contradictory constraints: vegan + high protein, only honey + oats | rejected: diet | ✅ safe |
| H15 | spicy + kid-friendly together (contradiction) | accepted · Everything on your confirmed list · 15 min | ✅ safe |

## 5. Ingredient-matching matrix — 104 directional pairs ("does the inventory item satisfy the recipe ingredient?")
- must match: 36, missed: **1** (safe direction: causes a false "need")
- must NOT match: 60, wrongly matched: **0** (dangerous: can create a false "Everything on hand")
  - ⚠️ missed: inventory "salad leaves" does not satisfy recipe "mixed greens"
- debatable pairs (not scored): chicken→chicken breast: match; greek yogurt→yogurt: match; yogurt→greek yogurt: no; black beans→beans: match; sugar→brown sugar: no; apples→apple juice: match; roast chicken→chicken: match; evaporated milk→milk: no

## 6. Scan vs type — structural effort accounting (counts, not timings)
Typing effort = characters to type the whole inventory. Scan effort = in-app taps (4) + native camera taps (2) + chips to review + corrections (each false positive = 1 tap; each false negative = typing its name; each wrong name = retype). No human speed data exists here; the crossover depends on it.
- Inventory size across kitchens: min 3, median 10, max 32 items.
- Small kitchens (≤6 items, n=6): typing the whole list = 21–67 characters. Scanning still costs 6 taps + a review, plus typing anything missed.
- Large kitchens (≥15 items, n=5): typing = 141–331 characters. With multiple false negatives (class C) the scan path still requires typing 22 chips, 0 del, 103 chars | 11 chips, 0 del, 40 chars | 10 chips, 0 del, 50 chars | 10 chips, 0 del, 42 chars | 15 chips, 0 del, 47 chars.

| Kitchen | Items | Type-all chars | Perfect scan (A) | 1 miss (B) | ~30% missed (C) | 3 false pos (E) | look-alike (O) |
|---|---|---|---|---|---|---|---|
| k01 nearly empty fridge | 3 | 21 | 3 chips, 0 del, 0 chars | 2 chips, 0 del, 7 chars | n/a | 6 chips, 3 del, 0 chars | n/a |
| k03 extremely crowded fridge | 32 | 331 | 32 chips, 0 del, 0 chars | 31 chips, 0 del, 10 chars | 22 chips, 0 del, 103 chars | n/a | 32 chips, 0 del, 12 chars |
| k05 pantry-heavy kitchen | 16 | 161 | 16 chips, 0 del, 0 chars | 15 chips, 0 del, 7 chars | 11 chips, 0 del, 40 chars | 19 chips, 3 del, 0 chars | 16 chips, 1 del, 6 chars |
| k09 breakfast-heavy | 12 | 111 | 12 chips, 0 del, 0 chars | 11 chips, 0 del, 7 chars | 8 chips, 0 del, 24 chars | 15 chips, 3 del, 0 chars | n/a |
| k13 baking-heavy pantry | 13 | 143 | 13 chips, 0 del, 0 chars | 12 chips, 0 del, 12 chars | 9 chips, 0 del, 25 chars | 16 chips, 3 del, 0 chars | 13 chips, 0 del, 6 chars |
| k15 lots of condiments | 15 | 165 | 15 chips, 0 del, 0 chars | 14 chips, 0 del, 21 chars | 10 chips, 0 del, 50 chars | 18 chips, 3 del, 0 chars | n/a |
| k17 brand-name products | 9 | 101 | 9 chips, 0 del, 0 chars | 8 chips, 0 del, 10 chars | 6 chips, 0 del, 32 chars | 12 chips, 3 del, 0 chars | 9 chips, 1 del, 13 chars |
| k20 very small ingredient set | 3 | 23 | 3 chips, 0 del, 0 chars | 2 chips, 0 del, 9 chars | n/a | 6 chips, 3 del, 0 chars | n/a |
| k21 vegan kitchen | 12 | 127 | 12 chips, 0 del, 0 chars | 11 chips, 0 del, 18 chars | 8 chips, 0 del, 37 chars | 15 chips, 3 del, 0 chars | 12 chips, 1 del, 8 chars |
| k25 Indian-style set | 15 | 141 | 15 chips, 0 del, 0 chars | 14 chips, 0 del, 5 chars | 10 chips, 0 del, 42 chars | 18 chips, 3 del, 0 chars | 15 chips, 1 del, 8 chars |
| k29 kid-focused family | 10 | 104 | 10 chips, 0 del, 0 chars | 9 chips, 0 del, 6 chars | 7 chips, 0 del, 40 chars | 13 chips, 3 del, 0 chars | n/a |
| k31 post-grocery-run haul | 22 | 203 | 22 chips, 0 del, 0 chars | 21 chips, 0 del, 15 chars | 15 chips, 0 del, 47 chars | 25 chips, 3 del, 0 chars | 22 chips, 1 del, 8 chars |
| k33 soup-maker | 11 | 118 | 11 chips, 0 del, 0 chars | 10 chips, 0 del, 16 chars | 8 chips, 0 del, 24 chars | 14 chips, 3 del, 0 chars | n/a |
| k37 Middle Eastern pantry | 12 | 113 | 12 chips, 0 del, 0 chars | 11 chips, 0 del, 5 chars | 8 chips, 0 del, 29 chars | 15 chips, 3 del, 0 chars | 12 chips, 1 del, 7 chars |
| k41 flour shelf | 8 | 73 | 8 chips, 0 del, 0 chars | 7 chips, 0 del, 13 chars | 6 chips, 0 del, 17 chars | 11 chips, 3 del, 0 chars | 8 chips, 1 del, 6 chars |
| k45 mild family kitchen | 9 | 82 | 9 chips, 0 del, 0 chars | 8 chips, 0 del, 5 chars | 6 chips, 0 del, 27 chars | 12 chips, 3 del, 0 chars | n/a |
| k49 picky-eater kitchen | 6 | 59 | 6 chips, 0 del, 0 chars | 5 chips, 0 del, 7 chars | 4 chips, 0 del, 31 chars | 9 chips, 3 del, 0 chars | n/a |

## 7. Persona journeys (SIMULATED — rule-based personas, not people)
Each persona's review behaviour and typed list are assumptions written in sim/personas.ts. Outcomes come from running the real product functions on those assumptions.

| # | Persona | Scan: vision error assumed → review | Scan outcome | Type: what they type | Type outcome | Friction (rule-flagged) | Recurring trigger |
|---|---|---|---|---|---|---|---|
| 1 | No idea what's in the fridge | multiple false negatives → skims | 2 recipes, 1 "everything", 0 false | chicken, eggs, spinach | 2 recipes, 1 "everything" | 10 list errors left in (review: skims); review screen has 22 chips (long scroll before "Find recipes"); type path requires going to look in the fridge first | weak recurring trigger: the need recurs, but every visit costs a full re-scan and review (nothing remembered) |
| 2 | Knows exactly what they want | perfect detection → careful | 2 recipes, 1 "everything", 0 false | spaghetti, canned tomatoes, garlic, parm… | 2 recipes, 1 "everything" | unsupported: asking for one specific dish (no 'make me X' input) | one-time novelty: already has a plan; the app adds a step between them and cooking |
| 3 | Only three ingredients | one false positive (mundane item) → careful | 2 recipes, 1 "everything", 0 false | pasta, butter, parmesan | 2 recipes, 1 "everything" | — | unclear: useful on 'empty fridge' nights; unclear how often those nights occur |
| 4 | Has 25+ ingredients | multiple false negatives → careful | 2 recipes, 1 "everything", 0 false | chicken breast, ground beef, salmon, ric… | 2 recipes, 1 "everything" | 7 edits to fix the scan; typing 203 chars; type path requires going to look in the fridge first | weak recurring trigger: post-shopping 'what do I do with all this' recurs weekly, but the list isn't kept between visits |
| 5 | Hates typing | one false negative → none | 2 recipes, 0 "everything", 0 false | chicken, broccoli, cheese | 2 recipes, 1 "everything" | 1 list errors left in (review: none) | weak recurring trigger: scan is the only path they tolerate; returns only if scans are reliably right |
| 6 | Hates taking photos | perfect detection → careful | 2 recipes, 1 "everything", 0 false | chicken breast, rice, carrots, peas, but… | 2 recipes, 1 "everything" | — | unclear: for them the product is 'typed list → verified recipes', i.e. close to a chat assistant plus checks |
| 7 | In a hurry | one false positive (mundane item) → none | 3 recipes, 0 "everything", 0 false | eggs, bread, bacon | 2 recipes, 1 "everything" | 1 list errors left in (review: none) | weak recurring trigger: time-pressed nights recur, but two AI waits + a review screen compete with just making toast |
| 8 | Cares about high protein | salient hallucination (protein) → skims | 1 recipes, 1 "everything", 0 false | chicken breast, eggs, greek yogurt, rice… | 1 recipes, 1 "everything" | 1 list errors left in (review: skims); unsupported: protein grams / macros (only 'has a protein source' is checked) | weak recurring trigger: daily protein goal is a real recurring need, but the app can't quantify protein |
| 9 | Cooks for a family | one false negative → careful | 2 recipes, 1 "everything", 0 false | chicken nuggets, macaroni, cheddar chees… | 2 recipes, 1 "everything" | unsupported: per-person dislikes / picky eaters beyond one free-text note | strong recurring trigger: nightly 'what's for dinner' for several people is a genuine daily trigger — if results are good |
| 10 | Only wants recipes they can make right now | packaged item misread as its parent → none | 3 recipes, 0 "everything", 0 false | rice, pasta, canned tomatoes, chickpeas,… | 2 recipes, 1 "everything" | review screen has 16 chips (long scroll before "Find recipes") | unclear: depends entirely on 'Everything on hand' being true; one false claim likely ends trust |
| 11 | Doesn't trust AI | confident but incorrect identity → careful | 2 recipes, 1 "everything", 0 false | chicken breast, broccoli, cheddar cheese… | 2 recipes, 1 "everything" | — | unclear: the visible checks may help or they may never get past the first wrong detection |
| 12 | Doesn't want to review ingredients | duplicate detection → none | 2 recipes, 0 "everything", 0 false | eggs, cheese, chicken | 2 recipes, 1 "everything" | unsupported: skipping review (the list is always shown before recipes) | weak recurring trigger: review is mandatory; skipping it is exactly what exposes them to false claims |
| 13 | Mainly cooks from leftovers | ambiguous / vague name → skims | 2 recipes, 1 "everything", 0 false | leftover rice, roast chicken, tortillas,… | 2 recipes, 1 "everything" | 2 list errors left in (review: skims); unsupported: telling the app food is already cooked (no 'leftover' handling) | strong recurring trigger: leftovers appear after most cooking; a natural 'use it up' trigger |
| 14 | Uses lots of packaged foods | brand name instead of ingredient → skims | 3 recipes, 2 "everything", 0 false | cream cheese, bagels, greek yogurt, pean… | 2 recipes, 1 "everything" | 2 list errors left in (review: skims); unsupported: brand names → ingredients | unclear: brands are exactly where detection naming is weakest |
| 15 | Often missing ingredients | one false negative → careful | 2 recipes, 1 "everything", 0 false | eggs, butter | 2 recipes, 1 "everything" | unsupported: shopping list / 'what to buy' (not built) | weak recurring trigger: the frequent answer will be 'need 2–3 things', which is what any recipe site says |
| 16 | Mostly wants inspiration | perfect detection → none | 2 recipes, 0 "everything", 0 false | rice, tofu, bok choy, eggs | 2 recipes, 1 "everything" | unsupported: conversational follow-up ('something different', 'make it spicier') without regenerating; unsupported: no photos/ratings to browse | one-time novelty: inspiration is better served by feeds with photos; 4 text cards per try |
| 17 | Already uses ChatGPT for this | one false negative → careful | 2 recipes, 1 "everything", 0 false | tofu, chickpeas, spinach, sweet potatoes… | 2 recipes, 1 "everything" | unsupported: follow-up questions / substitutions dialogue | unclear: must beat a free tool they already use; only edge is the verified 'need' list |
| 18 | Rarely cooks | brand name instead of ingredient → none | 3 recipes, 0 "everything", 0 false | instant ramen, eggs, cheese | 2 recipes, 1 "everything" | 2 list errors left in (review: none); type path requires going to look in the fridge first | one-time novelty: no recurring cooking habit to attach to |
| 19 | Cooks every night | multiple false positives → careful | 2 recipes, 1 "everything", 0 false | chicken breast, salmon, rice, spinach, g… | 2 recipes, 1 "everything" | 3 edits to fix the scan; review screen has 25 chips (long scroll before "Find recipes"); unsupported: remembering the kitchen between nights (re-scan/retype every time) | strong recurring trigger: daily need — but re-entering the kitchen daily is the structural cost |
| 20 | Wants very simple recipes | one false positive (mundane item) → skims | 3 recipes, 2 "everything", **1 FALSE** | bread, peanut butter, bananas, eggs | 2 recipes, 1 "everything" | 1 list errors left in (review: skims); unsupported: 'simple' is not verified (only time is) | weak recurring trigger: simple meals are often already known without an app |
