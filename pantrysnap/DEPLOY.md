# PantrySnap — deployment & validation status

Last updated: 2026-09-27. No secret values appear in this file — only variable names.

## Status

| Item                     | Status                                                                                                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production URL           | **Not deployed yet.** Needs someone with access to a Vercel account (steps below).                                                                                                           |
| Vercel build             | Verified from a clean clone: `npm ci` + `npm run build` with `VERCEL=1` → nitro `vercel` preset, Node 22 function, Build Output API v3.                                                      |
| Vercel output smoke test | Verified locally against the built output (the `__server` function plus static files), phone viewport, with a mock database + mock AI: scan → confirm → recipes, typed path, 3 large photos. |
| Live Supabase project    | `txxuxslhzrzitapjvzzr` (Lovable Cloud). Read-only probe on 2026-09-27: **`usage_events` and `app_events` do not exist → migrations 0001/0002 are NOT applied.**                              |
| Auth (live)              | Email + password on, **email confirmation required**; Google on (through Lovable's OAuth broker); anonymous/guest **off** (left off on purpose).                                             |
| Real-model evaluation    | Harness works (reaches the real gateway). **0 real cases** — the 10 folders in `eval/cases/_todo-*` are empty templates.                                                                     |

Until migrations 0001 and 0002 are applied, **every scan and typed session fails closed** with an
"unavailable" message: the server can't record usage, so it refuses to call the AI.

## 1. Environment variables

Set these in Vercel → Project → Settings → Environment Variables, for **Production** (and
**Preview** if you use preview URLs). Mark the two secrets as _Sensitive_.

| Name                            | Secret? | Read by                                | Notes                                                                |
| ------------------------------- | ------- | -------------------------------------- | -------------------------------------------------------------------- |
| `LOVABLE_API_KEY`               | **yes** | server (`ai-pipeline.server.ts`)       | AI gateway. Missing → scans fail closed.                             |
| `SUPABASE_SERVICE_ROLE_KEY`     | **yes** | server (`client.server.ts`)            | Usage ledger + analytics. Missing → scans fail closed.               |
| `SUPABASE_URL`                  | no      | server (auth middleware, admin client) | `https://<project-ref>.supabase.co`                                  |
| `SUPABASE_PUBLISHABLE_KEY`      | no      | server (auth middleware)               | Same value as the browser key.                                       |
| `VITE_SUPABASE_URL`             | no      | **browser, baked in at build time**    | Change → you must redeploy.                                          |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | no      | **browser, baked in at build time**    | Publishable/anon key only. Never put a secret in a `VITE_` variable. |

`SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PROJECT_ID` (in `.env.example`) and `LOVABLE_CRON_SECRET`
are not read by the current app; they are not needed.

**Where to get the values:** the Supabase URL and publishable key are public. `SUPABASE_SERVICE_ROLE_KEY`
and `LOVABLE_API_KEY` are managed by Lovable Cloud for this project. **Unverified:** whether
Lovable Cloud lets you copy them for use on another host. If it doesn't, the options are
(a) host on Lovable instead of Vercel, or (b) use your own Supabase project (then apply all three
migrations, including 0000) and an AI key the pipeline can use. That is a decision for the
project owner.

## 2. Supabase: migrations (apply once, in order, before deploying)

| File                                   | What it does                                                                                                                                                                                                                                                                 | Live?              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `0000_create_pantry_snap_core.sql`     | Original tables (`profiles`, `scans`, `recipes`, `favorites`).                                                                                                                                                                                                               | yes (tables exist) |
| `0001_secure_usage_and_profiles.sql`   | Users can only _read_ their profile (closes the self-grant-Pro hole); profile auto-created on sign-up; creates the `usage_events` ledger and the service-role-only functions `usage_limits`, `usage_summary`, `begin_usage`, `finish_usage`; legacy tables become read-only. | **no**             |
| `0002_typed_sessions_trial_events.sql` | Typed sessions share the allowance; guest limits (only used if guests are ever enabled); creates `app_events` + `log_event` for validation analytics.                                                                                                                        | **no**             |

Safety notes:

- **0001 changes existing data:** `UPDATE public.profiles SET is_pro = false WHERE is_pro;`.
  Payments never existed, so any `is_pro = true` row was self-granted through the old policy. Check
  the impact first: `select count(*) from public.profiles where is_pro;`.
- 0001 also inserts missing `profiles` rows for existing users (additive).
- Neither file can be run twice (`CREATE TABLE` without `IF NOT EXISTS`). Run each **once**, in a
  single transaction, 0001 before 0002. A failure rolls back cleanly.
- `npm run test:db` applies 0000 → 0001 → 0002 to a fresh local Postgres and runs 40 policy checks
  (all pass).

With a database connection string that has owner rights (keep it in your shell only):

```sh
cd pantrysnap
psql "$DATABASE_URL" -c "select count(*) as pro_rows from public.profiles where is_pro;"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f drizzle/migrations/0001_secure_usage_and_profiles.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f drizzle/migrations/0002_typed_sessions_trial_events.sql
# verify
psql "$DATABASE_URL" -c "select to_regclass('public.usage_events'), to_regclass('public.app_events');"
psql "$DATABASE_URL" -c "select public.usage_limits();"
```

If you have no direct connection (Lovable Cloud), paste each file's contents, in order, into the
project's SQL runner, then run the two verify queries.

## 3. Auth for testers

- **Guest mode is off** and stays off (no CAPTCHA yet). Testers create an account with email + password.
- **Email confirmation is on.** Supabase → Authentication → URL Configuration: add
  `https://<your-app>.vercel.app/**` to _Redirect URLs_ (and set _Site URL_ if Vercel becomes the
  main host). Otherwise confirmation links fall back to the old site URL.
- **Google sign-in** goes through Lovable's OAuth broker (`@lovable.dev/cloud-auth-js`). Whether it
  accepts a `vercel.app` origin is **unverified** — test it; testers can always use email.
- **Limits:** free accounts get 3 sessions (scan or typed) per month and 3 recipe runs per session.
  For the user study, mark each tester Pro (the 40-calls/day abuse cap still applies):

  ```sql
  update public.profiles set is_pro = true
  where id = (select id from auth.users where email = 'tester@example.com');
  ```

## 4. Deploy to Vercel (≈5 minutes, needs your Vercel login)

1. vercel.com → **Add New… → Project** → import GitHub repo `giancolif-maker/gmmarketing`.
2. **Root Directory:** `pantrysnap` (the repo root is a different Python project).
   Framework preset: leave as detected/"Other" — `pantrysnap/vercel.json` pins
   `npm ci` + `npm run build`, and nitro writes `.vercel/output` itself.
3. Add the six environment variables from §1 (Production, and Preview if wanted).
4. **Branch:** Vercel builds the repo's default branch (`main`) for Production, and every other
   branch as a Preview. The code is on `claude/youthful-bohr-nxrp62`. Either merge it to `main`
   (via a PR), or set Settings → Git → _Production Branch_ to that branch.
   Preview URLs sit behind **Vercel Authentication** by default, so phones must log in to Vercel;
   use the Production URL for testers.
5. Deploy. Check the build log shows `preset: vercel`.
6. Apply the migrations (§2) and the auth URL settings (§3) if not done yet.
7. Run the smoke test (§5). Only then send the URL to testers.

Runtime limits (verified or computed, not assumed away):

- The request body limit is 4.5 MB. The worst case measured (3 incompressible 12 MP photos after
  client resizing) is 2.3 MB; the theoretical maximum is ~4.1 MB. OK.
- Function duration: one scan can take up to ~50 s, recipes up to ~70 s. New Vercel projects use
  Fluid compute (default max 300 s). If your project has Fluid compute **off** on the Hobby
  plan, the limit is lower and long AI calls will be cut off — keep Fluid compute on.

## 5. Phone smoke test (production URL, real AI)

On an iPhone (Safari), with a tester account that has the migrations applied:

1. Open the URL. The home screen loads, and "Scan my food" / "Type what I have" are visible.
2. Scan → take a real photo of your fridge → **Find my ingredients**. The sign-in sheet appears → sign in.
3. Review: scanned chips are dashed with a camera icon, and the counter shows "0 of N confirmed".
4. Tap ✓ on a few, remove one, rename one (renaming confirms it). Leave one unconfirmed.
5. Set time/diet, then **Find recipes**.
6. Results: "Everything on your confirmed list" only where every item is confirmed;
   "Check you have: X" for recipes using the unconfirmed item; "Need: …" for missing items.
7. Open a recipe: missing items are tagged "need", unconfirmed ones "from photo, not confirmed".
8. Start over → **Type what I have** → "eggs, rice, spinach" → no camera markers → recipes.
9. Any error banner or blank screen = failure. Note the time; server logs are in Vercel → Logs.

## 6. Real-model evaluation

```sh
cd pantrysnap
export LOVABLE_API_KEY=…   # your shell only
npm run eval               # writes eval/results/…; exit 1 + "BLOCKED" if key/gateway/cases are missing
```

Adding a real case (write the ground truth **before** running anything):

1. Copy `eval/cases/_todo-01-normal-fridge` to `eval/cases/<your-case-id>` (drop the `_todo-` prefix).
2. Add 1–3 photos (JPEG/PNG/WebP; export HEIC as JPEG).
3. Replace `expected.txt` with what is really there, looking at the real fridge. Mark hard-to-see items `[hard]`.
4. Optional: `absent.txt` — items you checked are **not** there but a model might "see". The report flags them if detected.
5. Fill in the _Record_ section of `notes.md`, including expected ambiguous detections.
6. Optional: `typed.txt` (what a person would type), `request.json` (constraints).

Files still containing `PLACEHOLDER` are refused. Photos may contain personal items. Case folders
are committed to git unless you keep them outside the repo (`EVAL_DIR=/path npm run eval`).

## 7. Known blockers

1. No one with Vercel access has created the project yet → no public URL.
2. Migrations 0001/0002 are not applied on the live database → scans fail closed.
3. Getting `SUPABASE_SERVICE_ROLE_KEY` and `LOVABLE_API_KEY` for a non-Lovable host is unverified (§1).
4. The Supabase Auth redirect URL must include the Vercel domain, or email confirmation links go elsewhere.
5. 0 real evaluation cases.
