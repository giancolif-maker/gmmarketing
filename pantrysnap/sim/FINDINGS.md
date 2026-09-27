# Adversarial simulation — findings

Synthetic data only. The simulation shows how the **current code** behaves under controlled
failure conditions. It does not measure real vision accuracy, recipe desirability, or human
behaviour. Raw tables: `results/SIMULATION_DATA.md`.

## 1. Coverage

- 52 synthetic kitchens × 15 injected vision-error classes = 627 applicable runs, each under
  two review bounds (user fixes nothing / user fixes everything): 2,946 recipes verified.
- 55 adversarial cases: 20 verification, 20 constraint-bypass, 15 hostile inputs.
- 104 directional ingredient-matching pairs (36 must-match, 60 must-not, 8 debatable).
- 28 latency/failure scenarios through the real server orchestration.
- Scan-vs-type effort accounting for all 52 kitchens; 20 rule-based personas × both paths.

## 2. Critical failures (break the core promise)

1. **"Everything on hand" is exactly as true as the confirmed list.** In every class where
   vision puts something on the list that isn't really there (false positive, hallucinated
   protein, wrong identity, packaged item read as its parent, look-alike), **every** recipe
   whose only problem was that item was shown as "Everything on hand": 51/51, 51/51, 17/17,
   51/51, 22/22, 30/30. The verifier cannot catch this by design; the only defence is the user
   noticing on the review screen. Nothing on that screen distinguishes scanned guesses from
   confirmed items.
2. **The matcher equates different products — even with a perfect, typed list.** 10 of 60
   must-not pairs match: sweet potatoes→potatoes, egg noodles→eggs, chicken nuggets→chicken,
   milk chocolate / condensed milk / chocolate milk→milk, green beans→beans, green
   onions→onion, rice noodles→rice, frozen yogurt→yogurt. Each yields a false
   "Everything on hand" (hostile H05–H12). Cause: "inventory is more specific" accepts any extra
   word that isn't on a small blocklist, including words that change the product.

## 3. Trust failures (confidently false statements)

- False "Everything on hand": items above; step-only ingredients the scanner doesn't know
  (stock, mirin, hoisin — V10/V11); vague list items used as ingredients ("sauce" — H01);
  quantities trusted from vision (J: 3) or unparsed ("4 eggs, beaten" — V12).
- Diet / exclusion claims that are false: vegetarian recipe with bacon as an _optional_
  garnish (C03); "no dairy" with cheddar "if you like" (C05); vegan with ghee in steps (C11);
  vegetarian with bare "worcestershire" (C13) or "lardons" (C14); gluten-free with beer in
  steps (C15); "no spicy food" not understood, hot sauce passes (C08); "high protein" satisfied
  by egg noodles (C07).
- Time: a 15-minute request accepted a recipe whose steps add to 30 minutes (shown as a
  "10–30 min" range, not rejected — V03); "twenty-five minutes" unparsed (V18).
- Servings: "Feeds a family of four" not caught (V14); 8 eggs for 2 servings not questioned (V05).

## 4. Verification failures (not caught)

V03, V05, V10, V11, V12, V14, V18 · C03, C05, C07, C08, C11, C13, C14, C15 · H01, H05–H12.
**Caught:** step-only items in the vocabulary (soy sauce, butter, sesame oil), cream cheese ≠
cheese, coconut milk ≠ milk, peanut butter ≠ butter, AI "you have everything" text ignored,
single-step time contradictions, "Serves 4", overnight/hour phrasing, bacon in steps, cheddar in
steps under "no dairy", mushrooms in step 5, pine nuts under nut-free, pancetta under "no pork",
honey for vegan, soy sauce for gluten-free, protein-less "high protein", chili for kid-friendly.
**Self-consistency:** with a correct list, 0 false "Everything on hand" across 627 corrected runs
(aside from the matcher pairs above, which the kitchens didn't happen to contain).

## 5. UX friction (simulated, rule-flagged)

- Review is mandatory and is the only safeguard; skipping or skimming it is precisely what
  produces the false claims in §2.1 (personas 7, 20).
- Long lists: crowded fridges produce 22–32 chips; the "Find recipes" button is two screens down.
- Every missed item must be typed; an empty scan (class K) forces the typed path anyway.
- Brand and regional names produce false "need" items (40 in class H; cornflour, tinned
  tomatoes, salad leaves unmatched).
- Worst-case waits: detection up to ~45 s near its retry budget, then recipes up to ~70 s; retries
  are invisible to the user.
- Unsupported asks surfaced by personas: a specific dish, follow-up refinement ("spicier",
  "something else"), protein amounts, leftovers as cooked food, per-person dislikes.

## 6. Scan vs type (structural; no winner declared)

- **Type:** no vision errors and no detection wait (0 AI calls to build the list); exactly the
  user's intent. Cost: 21–67 characters for small kitchens (≤6 items), 141–331 for large ones
  (≥15). Requires knowing what's there. Still exposed to the matcher failures in §2.2.
- **Scan:** 6 taps plus reading N chips; each false negative must be typed; each false positive
  must be _noticed_ (attention, not taps). Structural advantage only for large, unknown
  inventories with few misses. For small or already-known inventories it adds steps and error
  sources relative to typing.

## 7. Differentiation (capability analysis, not a measured comparison)

Concrete where it holds: a deterministic "need" list including step-only ingredients; time,
diet and exclusion checks that reject rather than trust; an editable structured list; the same
list is checked the same way every time. Effectively equivalent to a general assistant when:
the user already knows the dish; wants inspiration; wants to refine by conversation; has 2–3
items; or doesn't care about verification. Weaker than a general assistant at: follow-up
refinement, breadth/variety (≤4 text cards), nutrition, rigid time buckets. The verified claim
reduces to "consistent with your list", so its value depends on the list being right.

## 8. Retention (structural)

Reasons that exist: recurring nightly decisions (family, cooks-every-night), leftovers, the
post-shopping "what do I do with all this". Reasons that don't: nothing is remembered between
sessions, so every visit costs the same re-scan or re-type and review; nothing improves with
use. Persona tally (assumption-based): strong trigger 3, weak 8, novelty 3, unclear 6 —
illustrative only.

## 9. Top 10 failure modes (by impact on the promise)

1. An uncorrected misidentified item → false "Everything on hand" (100% propagation).
2. Matcher treats different products as the same → false "Everything on hand" even for typed lists.
3. Optional/"if you like" garnishes skip diet and exclusion checks.
4. Step-only ingredients outside the scanner vocabulary (stock, ghee, beer, lardons,
   worcestershire, mirin, hoisin) → false "on hand" / diet bypass.
5. Amounts trusted from vision or left unparsed; no serving-size sanity → false "on hand" for quantities.
6. A successful scan/typed session is charged and then lost if reading usage fails (L18, L21).
7. Time limit bypassed by steps that add up beyond it; number words unparsed.
8. Free-text exclusions only understood in narrow phrasings ("no spicy food" fails).
9. False "need" items from brand/regional names and missed detections.
10. Two sequential AI waits (worst case ~2 minutes) with invisible retries.

## 10. Recommended fixes (only for failures found)

**Must fix before the real user test**

- §2.1: scope the claim to what is known — e.g. "Everything on your list", and visibly mark
  scanned items the user hasn't confirmed (review screen and recipe). Wording alone is cheap.
- §2.2: matcher — require the head noun to match and block product-changing modifiers
  (sweet, condensed, chocolate, frozen, green+bean/onion, nuggets, noodles); add the failing
  pairs as tests.
- #3: run diet and exclusion checks on optional sentences too (still skip them for availability).
- #4: add the missing diet-relevant words to the step scanner and diet lists (ghee, beer,
  lardons, worcestershire, gelatin, bare stock/broth).
- #6: return the successful session even when the usage read fails.
- #7: reject when step durations clearly exceed the limit; parse number words.
- #8: strip generic nouns (food, stuff, things, dishes) before matching exclusions.

**Can wait**: amount parsing ("4 eggs, beaten") and serving sanity; brand→generic and extra
regional synonyms; flagging vague list items ("sauce", "meat"); retry visibility; latency.

## 11. What simulation cannot answer

Real vision accuracy and how often each error class happens; whether users notice wrong items
on the review screen; whether recipes are appealing or actually work; scan vs type preference;
whether people cook what they pick; whether they return; whether they'd pay; whether PantrySnap
beats ChatGPT for real people; real latency.
