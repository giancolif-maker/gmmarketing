#!/usr/bin/env bash
# Applies the migrations to a throwaway local Postgres and runs the policy tests.
# Requires Postgres server binaries (initdb, pg_ctl) on PATH or PG_BIN.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$HERE/../.."
PG_BIN="${PG_BIN:-$(dirname "$(command -v initdb || ls -d /usr/lib/postgresql/*/bin/initdb | head -1)")}"
DATA="$(mktemp -d)"
PORT="${PGTEST_PORT:-55432}"
RUN_AS=()
if [ "$(id -u)" = 0 ]; then chown postgres "$DATA"; RUN_AS=(su postgres -c); fi
run() { if [ ${#RUN_AS[@]} -gt 0 ]; then "${RUN_AS[@]}" "$*"; else bash -c "$*"; fi; }
run "$PG_BIN/initdb -D $DATA -A trust -U postgres" >/dev/null
run "$PG_BIN/pg_ctl -D $DATA -o '-p $PORT -k /tmp' -l $DATA/log -w start" >/dev/null
trap 'run "$PG_BIN/pg_ctl -D $DATA -m immediate stop" >/dev/null; rm -rf "$DATA"' EXIT
PSQL=(psql -h /tmp -p "$PORT" -U postgres -X -q -v ON_ERROR_STOP=1)
"${PSQL[@]}" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto" >/dev/null
"${PSQL[@]}" -f "$HERE/auth_stub.sql" >/dev/null
for m in "$ROOT"/drizzle/migrations/*.sql; do PGOPTIONS="-c client_min_messages=warning" "${PSQL[@]}" -f "$m" >/dev/null; done
"${PSQL[@]}" -f "$HERE/usage_security.test.sql" 2>&1 | sed "s/^psql:[^ ]* NOTICE:  //" | grep -v "^$" | grep -v "^{"

# Concurrency: 10 simultaneous scan requests from a fresh free user -> exactly 3 allowed.
USER_C=cccccccc-cccc-4ccc-8ccc-cccccccccccc
"${PSQL[@]}" -c "INSERT INTO auth.users (id) VALUES ('$USER_C')"
for i in $(seq 1 10); do
  "${PSQL[@]}" -tA -c "SET ROLE service_role; SELECT public.begin_usage('$USER_C','detect') ->> 'ok'" &
done > "$DATA/race.txt"; wait
OK=$(grep -c true "$DATA/race.txt" || true)
if [ "$OK" != 3 ]; then echo "FAIL concurrent scans allowed: $OK (expected 3)"; exit 1; fi
echo "ok   10 concurrent scan requests -> 3 allowed"
