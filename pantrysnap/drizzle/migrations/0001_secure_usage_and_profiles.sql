-- Security hardening for PantrySnap.
--
-- Fixes (see audit):
--   * users could grant themselves Pro (profiles UPDATE policy)
--   * users could delete / backdate their own scans to reset the monthly quota
--   * the quota was only counted client-side
--
-- New model:
--   * profiles: users may only READ their own row. Plan status is server-controlled.
--   * usage_events: append-only ledger written exclusively by trusted server code
--     (service_role) through begin_usage / finish_usage. Users may only read their own rows.
--   * scans / recipes / favorites: legacy tables the app no longer writes. Kept for their
--     existing data, made read-only for users.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
REVOKE ALL ON public.profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.profiles FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- Payments have never existed, so every is_pro = true was self-granted through the old policy.
UPDATE public.profiles SET is_pro = false WHERE is_pro;

-- NOT VALID: enforce for new rows without failing on any pre-existing orphans.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

COMMENT ON COLUMN public.profiles.is_pro IS 'Server-controlled plan flag. Never writable by end users.';
COMMENT ON COLUMN public.profiles.diet_preferences IS 'Unused by the app (reserved).';
COMMENT ON COLUMN public.profiles.avatar_url IS 'Unused by the app (reserved).';

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Profiles are created by the database, not by the client.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- usage_events: append-only usage ledger (server-written only)
-- ---------------------------------------------------------------------------
CREATE TABLE public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('detect', 'recipes')),
  -- recipe generations must hang off a completed detection
  scan_id uuid REFERENCES public.usage_events(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete', 'failed', 'empty')),
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  CONSTRAINT usage_events_scan_link CHECK ((kind = 'recipes') = (scan_id IS NOT NULL))
);
CREATE INDEX usage_events_user_created_idx ON public.usage_events (user_id, created_at DESC);
CREATE INDEX usage_events_scan_idx ON public.usage_events (scan_id) WHERE scan_id IS NOT NULL;

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.usage_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;
CREATE POLICY "Users can view own usage" ON public.usage_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

COMMENT ON TABLE public.usage_events IS
  'Append-only AI usage ledger. Written only by server code via begin_usage/finish_usage.';

-- Limits live here so every enforcement path shares them.
CREATE OR REPLACE FUNCTION public.usage_limits()
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'free_scans_per_month', 3,
    'recipe_runs_per_scan', 3,
    'scan_valid_hours', 6,
    'events_per_minute', 6,
    'events_per_day', 40
  );
$$;

CREATE OR REPLACE FUNCTION public.usage_summary(p_user uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_limits jsonb := public.usage_limits();
  v_month timestamptz := date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_is_pro boolean;
  v_used integer;
BEGIN
  SELECT p.is_pro INTO v_is_pro FROM public.profiles p WHERE p.id = p_user;
  SELECT count(*) INTO v_used
  FROM public.usage_events e
  WHERE e.user_id = p_user AND e.kind = 'detect'
    AND e.status IN ('pending', 'complete') AND e.created_at >= v_month;
  RETURN jsonb_build_object(
    'is_pro', coalesce(v_is_pro, false),
    'scans_used', v_used,
    'scan_limit', (v_limits ->> 'free_scans_per_month')::int,
    'resets_at', v_month + interval '1 month'
  );
END;
$$;

-- Atomically checks limits and records a pending usage event.
-- Returns {"ok":true,"id":...} or {"ok":false,"code":...}.
CREATE OR REPLACE FUNCTION public.begin_usage(p_user uuid, p_kind text, p_scan uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_limits jsonb := public.usage_limits();
  v_summary jsonb;
  v_id uuid;
BEGIN
  IF p_user IS NULL OR p_kind NOT IN ('detect', 'recipes') THEN
    RAISE EXCEPTION 'begin_usage: invalid arguments';
  END IF;

  -- Serialize concurrent requests from the same user so limits cannot be raced.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text, 0));

  IF (SELECT count(*) FROM public.usage_events e
      WHERE e.user_id = p_user AND e.created_at > now() - interval '1 minute')
      >= (v_limits ->> 'events_per_minute')::int
  OR (SELECT count(*) FROM public.usage_events e
      WHERE e.user_id = p_user AND e.created_at > now() - interval '1 day')
      >= (v_limits ->> 'events_per_day')::int THEN
    RETURN jsonb_build_object('ok', false, 'code', 'RATE_LIMITED');
  END IF;

  IF p_kind = 'detect' THEN
    v_summary := public.usage_summary(p_user);
    IF NOT (v_summary ->> 'is_pro')::boolean
       AND (v_summary ->> 'scans_used')::int >= (v_summary ->> 'scan_limit')::int THEN
      RETURN jsonb_build_object('ok', false, 'code', 'QUOTA_EXCEEDED');
    END IF;
  ELSE
    IF p_scan IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.usage_events s
      WHERE s.id = p_scan AND s.user_id = p_user AND s.kind = 'detect' AND s.status = 'complete'
        AND s.created_at > now() - make_interval(hours => (v_limits ->> 'scan_valid_hours')::int)
    ) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'SCAN_EXPIRED');
    END IF;
    IF (SELECT count(*) FROM public.usage_events r
        WHERE r.scan_id = p_scan AND r.status IN ('pending', 'complete'))
        >= (v_limits ->> 'recipe_runs_per_scan')::int THEN
      RETURN jsonb_build_object('ok', false, 'code', 'RECIPE_LIMIT');
    END IF;
  END IF;

  INSERT INTO public.usage_events (user_id, kind, scan_id)
  VALUES (p_user, p_kind, CASE WHEN p_kind = 'recipes' THEN p_scan END)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

-- Settles a pending event. 'failed' and 'empty' do not count toward the monthly quota
-- (they still count toward the per-minute / per-day abuse limits).
CREATE OR REPLACE FUNCTION public.finish_usage(p_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_status NOT IN ('complete', 'failed', 'empty') THEN
    RAISE EXCEPTION 'finish_usage: invalid status';
  END IF;
  UPDATE public.usage_events
  SET status = p_status, finished_at = now()
  WHERE id = p_id AND status = 'pending';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.usage_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.usage_summary(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.begin_usage(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finish_usage(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.usage_limits() TO service_role;
GRANT EXECUTE ON FUNCTION public.usage_summary(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.begin_usage(uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_usage(uuid, text) TO service_role;

-- ---------------------------------------------------------------------------
-- Legacy tables: no longer written by the app. Read-only for users.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own scans" ON public.scans;
DROP POLICY IF EXISTS "Users manage own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users manage own favorites" ON public.favorites;
REVOKE ALL ON public.scans, public.recipes, public.favorites FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.scans, public.recipes, public.favorites FROM authenticated;
GRANT SELECT ON public.scans, public.recipes, public.favorites TO authenticated;
CREATE POLICY "Users can view own scans" ON public.scans
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own recipes" ON public.recipes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own favorites" ON public.favorites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.scans
  ADD CONSTRAINT scans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.favorites
  ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

COMMENT ON TABLE public.scans IS 'DEPRECATED: legacy client-written scan log. Usage is tracked in usage_events.';
COMMENT ON TABLE public.recipes IS 'UNUSED: reserved for saved recipes; not written by the app.';
COMMENT ON TABLE public.favorites IS 'UNUSED: reserved for saved recipes; not written by the app.';
