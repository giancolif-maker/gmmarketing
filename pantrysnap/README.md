# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Checks

```sh
npm run lint        # eslint + prettier (generated src/integrations/** is excluded)
npx tsc --noEmit    # typecheck
npm test            # unit tests (app logic + evaluation scoring)
npm run test:db     # applies drizzle/migrations to a throwaway local Postgres; tests RLS + limits
npm run build
```

`npm run test:db` needs Postgres server binaries (`initdb`, `pg_ctl`) on the machine.

## Real testing setup

### 1. Environment variables

| Variable                                             | Where                                  | Secret? | Used for                                                                 |
| ---------------------------------------------------- | -------------------------------------- | ------- | ------------------------------------------------------------------------ |
| `LOVABLE_API_KEY`                                    | server + your shell for `npm run eval` | **yes** | AI gateway (`google/gemini-3.1-flash-lite` via `ai.gateway.lovable.dev`) |
| `SUPABASE_SERVICE_ROLE_KEY`                          | server only                            | **yes** | usage limits + analytics (service-role-only DB functions)                |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`           | server                                 | no      | auth check, DB                                                           |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | browser build                          | no      | sign-in                                                                  |

Secrets are read with `process.env` in server-only modules and never reach the browser bundle.
Never prefix a secret with `VITE_`. Keep them in Lovable Cloud / your hosting secrets or your
shell — not in git, not in chat. If a server secret is missing, scans fail closed with an
"unavailable" message.

### 2. Database migrations (apply in this order)

1. `drizzle/migrations/0000_create_pantry_snap_core.sql` — original schema (already live)
2. `drizzle/migrations/0001_secure_usage_and_profiles.sql` — locked-down RLS, usage ledger
3. `drizzle/migrations/0002_typed_sessions_trial_events.sql` — typed sessions, guest limits, `app_events`

0001 and 0002 must be applied **before** deploying the current code. Check first whether your
platform applies `drizzle/migrations` automatically (unverified for Lovable Cloud). If not,
apply the missing files in order with a database connection that has owner rights, e.g.
`psql "$DATABASE_URL" -f drizzle/migrations/0001_secure_usage_and_profiles.sql`, then 0002.
`npm run test:db` proves the three files apply cleanly in order on a fresh database.

### 3. Evaluate the real model (no app or database needed)

```sh
export LOVABLE_API_KEY=…
npm run eval
```

See `eval/README.md` (dataset format, metrics, report), `eval/HUMAN_EVAL.md`,
`eval/CHATGPT_COMPARISON.md` and `eval/USER_TEST.md`.

### 4. Testers

Free accounts get 3 tries per month (scan or typed). For the user study, mark testers so the
limit doesn't end a session early (the 40-calls/day abuse cap still applies):

```sql
update public.profiles set is_pro = true where id = '<tester auth user id>';
```

### 5. Guest trial (off unless you enable it)

One guest try before sign-up happens **only if anonymous sign-ins are enabled** in Supabase
Auth settings (currently disabled on the project). Otherwise the app shows the sign-in screen.
Enable CAPTCHA before turning it on for a public audience.
