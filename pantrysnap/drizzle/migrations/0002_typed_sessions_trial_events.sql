-- Validation-MVP changes:
--   * typed ingredient lists are a session kind ('typed') alongside photo scans ('detect');
--     both count toward the same monthly allowance and both can be used for recipe runs
--   * anonymous (guest) users get a one-time trial, enforced server-side
--   * app_events: minimal, server-written analytics for the validation study

-- ---------------------------------------------------------------------------- usage kinds
ALTER TABLE public.usage_events DROP CONSTRAINT IF EXISTS usage_events_kind_check;
ALTER TABLE public.usage_events
  ADD CONSTRAINT usage_events_kind_check CHECK (kind IN ('detect', 'typed', 'recipes'));

CREATE OR REPLACE FUNCTION public.usage_limits()
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'free_scans_per_month', 3,
    'recipe_runs_per_scan', 3,
    'scan_valid_hours', 6,
    'events_per_minute', 6,
    'events_per_day', 40,
    'guest_sessions_total', 1,
    'guest_recipe_runs_per_scan', 2,
    'analytics_events_per_day', 300
  );
$$;

-- Reads auth.users.is_anonymous without depending on that column existing
-- (older auth schemas lack it; then nobody is treated as a guest).
CREATE OR REPLACE FUNCTION public.is_guest(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce((SELECT (to_jsonb(u) ->> 'is_anonymous')::boolean FROM auth.users u WHERE u.id = p_user), false);
$$;

CREATE OR REPLACE FUNCTION public.usage_summary(p_user uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_limits jsonb := public.usage_limits();
  v_month timestamptz := date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_guest boolean := public.is_guest(p_user);
  v_is_pro boolean;
  v_used integer;
BEGIN
  SELECT p.is_pro INTO v_is_pro FROM public.profiles p WHERE p.id = p_user;
  SELECT count(*) INTO v_used
  FROM public.usage_events e
  WHERE e.user_id = p_user AND e.kind IN ('detect', 'typed')
    AND e.status IN ('pending', 'complete')
    AND (v_guest OR e.created_at >= v_month);
  RETURN jsonb_build_object(
    'is_pro', coalesce(v_is_pro, false) AND NOT v_guest,
    'is_anonymous', v_guest,
    'scans_used', v_used,
    'scan_limit', CASE WHEN v_guest THEN (v_limits ->> 'guest_sessions_total')::int
                       ELSE (v_limits ->> 'free_scans_per_month')::int END,
    'resets_at', CASE WHEN v_guest THEN NULL ELSE v_month + interval '1 month' END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.begin_usage(p_user uuid, p_kind text, p_scan uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_limits jsonb := public.usage_limits();
  v_summary jsonb;
  v_guest boolean;
  v_id uuid;
BEGIN
  IF p_user IS NULL OR p_kind NOT IN ('detect', 'typed', 'recipes') THEN
    RAISE EXCEPTION 'begin_usage: invalid arguments';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  v_guest := public.is_guest(p_user);

  IF (SELECT count(*) FROM public.usage_events e
      WHERE e.user_id = p_user AND e.created_at > now() - interval '1 minute')
      >= (v_limits ->> 'events_per_minute')::int
  OR (SELECT count(*) FROM public.usage_events e
      WHERE e.user_id = p_user AND e.created_at > now() - interval '1 day')
      >= (v_limits ->> 'events_per_day')::int THEN
    RETURN jsonb_build_object('ok', false, 'code', 'RATE_LIMITED');
  END IF;

  IF p_kind IN ('detect', 'typed') THEN
    v_summary := public.usage_summary(p_user);
    IF NOT (v_summary ->> 'is_pro')::boolean
       AND (v_summary ->> 'scans_used')::int >= (v_summary ->> 'scan_limit')::int THEN
      RETURN jsonb_build_object('ok', false, 'code', CASE WHEN v_guest THEN 'TRIAL_USED' ELSE 'QUOTA_EXCEEDED' END);
    END IF;
  ELSE
    IF p_scan IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.usage_events s
      WHERE s.id = p_scan AND s.user_id = p_user AND s.kind IN ('detect', 'typed') AND s.status = 'complete'
        AND s.created_at > now() - make_interval(hours => (v_limits ->> 'scan_valid_hours')::int)
    ) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'SCAN_EXPIRED');
    END IF;
    IF (SELECT count(*) FROM public.usage_events r
        WHERE r.scan_id = p_scan AND r.status IN ('pending', 'complete'))
        >= (CASE WHEN v_guest THEN (v_limits ->> 'guest_recipe_runs_per_scan')::int
                 ELSE (v_limits ->> 'recipe_runs_per_scan')::int END) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'RECIPE_LIMIT');
    END IF;
  END IF;

  INSERT INTO public.usage_events (user_id, kind, scan_id)
  VALUES (p_user, p_kind, CASE WHEN p_kind = 'recipes' THEN p_scan END)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_guest(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.usage_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.usage_summary(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.begin_usage(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_guest(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.usage_limits() TO service_role;
GRANT EXECUTE ON FUNCTION public.usage_summary(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.begin_usage(uuid, text, uuid) TO service_role;

-- ---------------------------------------------------------------------------- analytics
-- Structured product events for the validation study. No images, no ingredient lists,
-- no free text beyond a recipe name. Not readable or writable by end users.
CREATE TABLE public.app_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.usage_events(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (name IN (
    'input_mode_selected', 'session_started', 'ingredients_confirmed',
    'recipes_result', 'recipe_opened', 'recipe_feedback'
  )),
  props jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(props::text) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX app_events_name_created_idx ON public.app_events (name, created_at DESC);
CREATE INDEX app_events_session_idx ON public.app_events (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX app_events_user_created_idx ON public.app_events (user_id, created_at DESC);
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.app_events TO service_role;
COMMENT ON TABLE public.app_events IS 'Validation-study analytics. Server-written only via log_event.';

-- Session ids supplied by the client must belong to the same user; otherwise they are dropped.
CREATE OR REPLACE FUNCTION public.log_event(p_user uuid, p_name text, p_props jsonb, p_session uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_session uuid;
BEGIN
  IF (SELECT count(*) FROM public.app_events a
      WHERE a.user_id = p_user AND a.created_at > now() - interval '1 day')
      >= (public.usage_limits() ->> 'analytics_events_per_day')::int THEN
    RETURN false;
  END IF;
  SELECT s.id INTO v_session FROM public.usage_events s
  WHERE s.id = p_session AND s.user_id = p_user AND s.kind IN ('detect', 'typed');
  INSERT INTO public.app_events (user_id, session_id, name, props)
  VALUES (p_user, v_session, p_name, coalesce(p_props, '{}'::jsonb));
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_event(uuid, text, jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_event(uuid, text, jsonb, uuid) TO service_role;
