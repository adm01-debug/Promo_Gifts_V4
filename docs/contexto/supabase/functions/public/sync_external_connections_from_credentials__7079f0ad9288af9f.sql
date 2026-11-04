CREATE OR REPLACE FUNCTION public.sync_external_connections_from_credentials(_trigger_secret_name text DEFAULT NULL::text, _trigger_op text DEFAULT 'manual'::text, _trigger_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _system_uid uuid;
  _env_keys text[] := ARRAY['promobrind', 'crm'];
  _env_key text; _url_name text; _anon_name text; _svc_name text;
  _has_url boolean; _has_anon boolean; _has_svc boolean;
  _status text; _name text;
  _processed int := 0; _created int := 0; _updated int := 0;
  _is_insert boolean; _start timestamptz := clock_timestamp();
  _result jsonb; _err text;
BEGIN
  SELECT user_id INTO _system_uid FROM public.user_roles WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1;
  IF _system_uid IS NULL THEN
    INSERT INTO public.external_connections_sync_log (
      connection_name, sync_type, status, error_message, duration_ms, metadata
    ) VALUES (
      'system_actor_lookup', COALESCE(_trigger_op, 'manual'), 'no_admin', 'no_admin_for_system_actor',
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - _start))::int,
      jsonb_build_object('trigger_user_id', _trigger_user_id, 'trigger_secret', _trigger_secret_name)
    );
    RETURN jsonb_build_object('ok', false, 'reason', 'no_admin_for_system_actor');
  END IF;
  BEGIN
    FOREACH _env_key IN ARRAY _env_keys LOOP
      _url_name  := 'EXTERNAL_' || upper(_env_key) || '_URL';
      _anon_name := 'EXTERNAL_' || upper(_env_key) || '_ANON_KEY';
      _svc_name  := 'EXTERNAL_' || upper(_env_key) || '_SERVICE_ROLE_KEY';
      SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _url_name  AND length > 0) INTO _has_url;
      SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _anon_name AND length > 0) INTO _has_anon;
      SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _svc_name  AND length > 0) INTO _has_svc;
      IF _has_url AND _has_svc THEN _status := 'active'; ELSE _status := 'unconfigured'; END IF;
      _name := CASE _env_key
        WHEN 'promobrind' THEN 'Catálogo Promobrind'
        WHEN 'crm' THEN 'CRM Promobrind'
        ELSE initcap(_env_key) END;
      SELECT NOT EXISTS (
        SELECT 1 FROM public.external_connections WHERE env_key = _env_key AND type = 'supabase'
      ) INTO _is_insert;
      INSERT INTO public.external_connections (type, name, env_key, config, secret_refs, status, created_by)
      VALUES ('supabase', _name, _env_key,
              jsonb_build_object('mirrored_from', 'integration_credentials'),
              ARRAY[_url_name, _anon_name, _svc_name], _status, _system_uid)
      ON CONFLICT (env_key, type) WHERE env_key IS NOT NULL DO UPDATE
      SET status = EXCLUDED.status, secret_refs = EXCLUDED.secret_refs,
          name = EXCLUDED.name, updated_at = now();
      IF _is_insert THEN _created := _created + 1; ELSE _updated := _updated + 1; END IF;
      _processed := _processed + 1;
    END LOOP;
    INSERT INTO public.external_connections_sync_log (
      connection_name, sync_type, status, records_processed, duration_ms, metadata
    ) VALUES (
      'sync_all', COALESCE(_trigger_op, 'manual'), 'ok', _processed,
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - _start))::int,
      jsonb_build_object('env_keys', _env_keys, 'created', _created, 'updated', _updated,
                         'trigger_user_id', _trigger_user_id, 'trigger_secret', _trigger_secret_name)
    );
    _result := jsonb_build_object('ok', true, 'processed', _processed, 'created', _created, 'updated', _updated, 'ran_at', now());
    RETURN _result;
  EXCEPTION WHEN OTHERS THEN
    _err := SQLERRM;
    INSERT INTO public.external_connections_sync_log (
      connection_name, sync_type, status, error_message, records_processed, records_failed, duration_ms
    ) VALUES (
      'sync_all', COALESCE(_trigger_op, 'manual'), 'error', _err, _processed, _env_keys::text[]::int,
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - _start))::int
    );
    RAISE;
  END;
END;
$function$
