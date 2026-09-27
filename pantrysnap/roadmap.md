# Pantry Snap — validation MVP

- [x] Two equal ways in: scan photos or type what you have (same pipeline)
- [x] Empty scan falls back to typing; nobody is forced through computer vision
- [x] One review screen: inline edit/remove/add ingredients + quick constraints
- [x] Constraints: time, servings, diet, high protein, spicy, kid-friendly, meal, cuisine, free-text note
- [x] Recipe verification in code: availability (list + steps), time vs step durations, servings,
      diet, free-text exclusions, protein/spice evidence, counts, substitutions
- [x] Results show verified facts; AI explanations are labelled as such
- [x] Validation analytics (app_events) + "did you cook it / was it useful" feedback
- [x] Optional one-time guest trial (inactive until anonymous sign-ins are enabled)
- [ ] Real-model evaluation — harness ready (`npm run eval`), needs LOVABLE_API_KEY and real photos
- [ ] Not building yet: saved recipes, pantry, payments, cooking mode, meal plans, shopping lists
