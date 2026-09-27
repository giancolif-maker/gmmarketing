# Pantry Snap MVP

- [x] Mobile-first photo upload (camera or library), resized and metadata-stripped on device
- [x] AI ingredient detection with validated output, one retry, timeouts and cancellation
- [x] Ingredient confirmation and meal preferences
- [x] Recipe generation validated in code: have/missing, time limit and diet are computed server-side, not trusted from the AI
- [x] Email and Google sign-in
- [x] Server-enforced monthly scan limit, per-scan recipe limit and abuse rate limits (usage_events ledger)
- [x] Flow survives refresh, Back/Forward and sign-in redirects (per-tab session storage)
- [ ] Saved recipes — removed until they can be persisted for real (recipes/favorites tables are unused)
- [ ] Cooking mode — removed (the old button did nothing)
- [ ] Paid plans — not built; `profiles.is_pro` can only be set by trusted server/admin code
