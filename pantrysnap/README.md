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
npm test            # unit tests: AI-output parsing, recipe validation, image sanitising, request limits
npm run test:db     # applies drizzle/migrations to a throwaway local Postgres and tests RLS + usage limits
npm run build
LOVABLE_API_KEY=... npm run eval   # real-model evaluation on eval/cases (or EVAL_DIR=...), writes eval/report.md
```

`npm run test:db` needs Postgres server binaries (`initdb`, `pg_ctl`) on the machine.

## Server environment

Server functions require `SUPABASE_SERVICE_ROLE_KEY` (usage ledger) and `LOVABLE_API_KEY` (AI gateway).
If either is missing, scans fail closed with a friendly "unavailable" message.

## Guest trial (optional)

The app offers one guest try before sign-up **only if anonymous sign-ins are enabled** in
Supabase Auth settings; otherwise it falls back to the sign-in screen. Enable CAPTCHA before
turning this on for a public audience.
