-- Policy / usage-ledger tests. Run with supabase/tests/run.sh against a throwaway Postgres.
-- Every check raises an exception on failure, so the script exits non-zero (ON_ERROR_STOP).
\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on
\pset format unaligned

INSERT INTO auth.users (id, raw_user_meta_data) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '{"full_name":"Alice"}'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '{}'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '{}');

CREATE FUNCTION pg_temp.expect_denied(label text, stmt text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  BEGIN
    EXECUTE stmt;
    GET DIAGNOSTICS n = ROW_COUNT;
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    RAISE NOTICE 'ok   %', label; RETURN;
  END;
  IF n = 0 THEN RAISE NOTICE 'ok   % (0 rows)', label; RETURN; END IF;
  RAISE EXCEPTION 'FAIL %: statement succeeded (% rows)', label, n;
END $$;

CREATE FUNCTION pg_temp.expect(label text, ok boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAIL %', label; END IF;
  RAISE NOTICE 'ok   %', label;
END $$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO PUBLIC;

-- Trigger created profiles for new users.
SELECT pg_temp.expect('profile auto-created by trigger',
  (SELECT count(*) FROM public.profiles) = 3);
SELECT pg_temp.expect('display_name copied from metadata',
  (SELECT display_name FROM public.profiles WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') = 'Alice');

-- Seed: Alice has used 3 scans this month (written the trusted way).
SET ROLE service_role;
SELECT public.begin_usage('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'detect') FROM generate_series(1, 3);
UPDATE public.usage_events SET status = 'complete';
RESET ROLE;

-- ---------------------------------------------------------------- as Alice
SET ROLE authenticated;
SET request.jwt.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

SELECT pg_temp.expect_denied('user cannot grant self Pro',
  $q$UPDATE public.profiles SET is_pro = true WHERE id = auth.uid()$q$);
SELECT pg_temp.expect_denied('user cannot insert a profile',
  $q$INSERT INTO public.profiles (id, is_pro) VALUES (auth.uid(), true)$q$);
SELECT pg_temp.expect_denied('user cannot upsert profile',
  $q$INSERT INTO public.profiles (id, is_pro) VALUES (auth.uid(), true) ON CONFLICT (id) DO UPDATE SET is_pro = true$q$);
SELECT pg_temp.expect_denied('user cannot delete own profile',
  $q$DELETE FROM public.profiles WHERE id = auth.uid()$q$);
SELECT pg_temp.expect('user can read own profile',
  (SELECT count(*) FROM public.profiles) = 1);

SELECT pg_temp.expect_denied('user cannot delete usage events',
  $q$DELETE FROM public.usage_events$q$);
SELECT pg_temp.expect_denied('user cannot backdate usage events',
  $q$UPDATE public.usage_events SET created_at = '2000-01-01'$q$);
SELECT pg_temp.expect_denied('user cannot mark usage failed',
  $q$UPDATE public.usage_events SET status = 'failed'$q$);
SELECT pg_temp.expect_denied('user cannot insert usage events',
  $q$INSERT INTO public.usage_events (user_id, kind) VALUES (auth.uid(), 'detect')$q$);
SELECT pg_temp.expect_denied('user cannot call begin_usage',
  $q$SELECT public.begin_usage(auth.uid(), 'detect')$q$);
SELECT pg_temp.expect_denied('user cannot call finish_usage',
  $q$SELECT public.finish_usage(gen_random_uuid(), 'failed')$q$);
SELECT pg_temp.expect_denied('user cannot call usage_summary',
  $q$SELECT public.usage_summary(auth.uid())$q$);
SELECT pg_temp.expect('user can read own usage (3 rows)',
  (SELECT count(*) FROM public.usage_events) = 3);

SELECT pg_temp.expect_denied('legacy scans: no delete',
  $q$DELETE FROM public.scans$q$);
SELECT pg_temp.expect_denied('legacy scans: no insert',
  $q$INSERT INTO public.scans (user_id, created_at) VALUES (auth.uid(), '2000-01-01')$q$);
SELECT pg_temp.expect_denied('legacy recipes: no insert',
  $q$INSERT INTO public.recipes (user_id, name) VALUES (auth.uid(), 'x')$q$);
SELECT pg_temp.expect_denied('legacy favorites: no delete',
  $q$DELETE FROM public.favorites$q$);

-- ---------------------------------------------------------------- as Bob
SET request.jwt.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
SELECT pg_temp.expect('Bob cannot see Alice usage',
  (SELECT count(*) FROM public.usage_events) = 0);
SELECT pg_temp.expect('Bob cannot see Alice profile',
  (SELECT count(*) FROM public.profiles WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') = 0);
RESET ROLE;

-- ---------------------------------------------------------------- anon
SET ROLE anon;
SELECT pg_temp.expect_denied('anon cannot read profiles', $q$SELECT 1 FROM public.profiles$q$);
SELECT pg_temp.expect_denied('anon cannot read usage', $q$SELECT 1 FROM public.usage_events$q$);
RESET ROLE;

-- ---------------------------------------------------------------- server-side enforcement
SET ROLE service_role;
SELECT pg_temp.expect('4th free scan is refused',
  public.begin_usage('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'detect') ->> 'code' = 'QUOTA_EXCEEDED');
SELECT pg_temp.expect('summary reports 3 of 3',
  (public.usage_summary('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') ->> 'scans_used')::int = 3);

-- Recipe runs require a valid, recent, completed scan of the same user.
SELECT pg_temp.expect('recipes without scan refused',
  public.begin_usage('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'recipes', NULL) ->> 'code' = 'SCAN_EXPIRED');
SELECT pg_temp.expect('recipes with random scan refused',
  public.begin_usage('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'recipes', gen_random_uuid()) ->> 'code' = 'SCAN_EXPIRED');
SELECT pg_temp.expect('recipes with another user''s scan refused',
  public.begin_usage('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'recipes',
    (SELECT id FROM public.usage_events LIMIT 1)) ->> 'code' = 'SCAN_EXPIRED');

-- Bob: failed / empty scans are refunded; recipe runs capped per scan.
DO $$
DECLARE r jsonb; scan uuid; i int;
BEGIN
  r := public.begin_usage('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'detect');
  PERFORM public.finish_usage((r ->> 'id')::uuid, 'failed');
  r := public.begin_usage('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'detect');
  PERFORM public.finish_usage((r ->> 'id')::uuid, 'empty');
  IF (public.usage_summary('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') ->> 'scans_used')::int <> 0 THEN
    RAISE EXCEPTION 'FAIL failed/empty scans should not count';
  END IF;
  r := public.begin_usage('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'detect');
  scan := (r ->> 'id')::uuid;
  IF (public.begin_usage('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'recipes', scan) ->> 'code') <> 'SCAN_EXPIRED' THEN
    RAISE EXCEPTION 'FAIL recipes allowed on a pending scan';
  END IF;
  PERFORM public.finish_usage(scan, 'complete');
  PERFORM public.finish_usage(scan, 'failed'); -- settled events are immutable
  IF (SELECT status FROM public.usage_events WHERE id = scan) <> 'complete' THEN
    RAISE EXCEPTION 'FAIL settled event was changed';
  END IF;
  FOR i IN 1..3 LOOP
    r := public.begin_usage('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'recipes', scan);
    IF NOT (r ->> 'ok')::boolean THEN RAISE EXCEPTION 'FAIL recipe run % refused: %', i, r; END IF;
  END LOOP;
  -- 6 events in the last minute now -> burst limit applies before the per-scan limit
  r := public.begin_usage('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'recipes', scan);
  IF r ->> 'code' <> 'RATE_LIMITED' THEN RAISE EXCEPTION 'FAIL expected RATE_LIMITED, got %', r; END IF;
  UPDATE public.usage_events SET created_at = now() - interval '2 minutes' WHERE user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  r := public.begin_usage('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'recipes', scan);
  IF r ->> 'code' <> 'RECIPE_LIMIT' THEN RAISE EXCEPTION 'FAIL expected RECIPE_LIMIT, got %', r; END IF;
  -- scans expire
  UPDATE public.usage_events SET created_at = now() - interval '7 hours' WHERE id = scan;
  DELETE FROM public.usage_events WHERE scan_id = scan;
  r := public.begin_usage('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'recipes', scan);
  IF r ->> 'code' <> 'SCAN_EXPIRED' THEN RAISE EXCEPTION 'FAIL expected SCAN_EXPIRED, got %', r; END IF;
  RAISE NOTICE 'ok   refunds, per-scan recipe cap, burst limit, scan expiry';
END $$;

-- Daily abuse cap applies even to Pro users.
DO $$
DECLARE r jsonb;
BEGIN
  UPDATE public.profiles SET is_pro = true WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  INSERT INTO public.usage_events (user_id, kind, status, created_at)
  SELECT 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'detect', 'complete', now() - interval '3 hours'
  FROM generate_series(1, 40);
  r := public.begin_usage('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'detect');
  IF r ->> 'code' <> 'RATE_LIMITED' THEN RAISE EXCEPTION 'FAIL daily cap not enforced: %', r; END IF;
  RAISE NOTICE 'ok   daily cap (40/day) applies to Pro users';
END $$;

-- Pro is honoured only when set by trusted code.
UPDATE public.profiles SET is_pro = true WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SELECT pg_temp.expect('Pro user passes quota',
  (public.begin_usage('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'detect') ->> 'ok')::boolean);
SELECT pg_temp.expect('updated_at trigger fires',
  (SELECT updated_at > created_at FROM public.profiles WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'));
RESET ROLE;

\echo 'ALL POLICY TESTS PASSED'
