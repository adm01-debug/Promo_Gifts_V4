-- ============================================================================
-- Fase 4 v2 · Oficial · Drift check SQL nativo via pg_net (sem edge function)
-- ============================================================================

-- 1) Placeholder no system_settings para config do Lovable (Abner preenche)
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('lovable_url', '"https://pqpdolkaeqlyzpdpbizo.supabase.co"'::jsonb,
   'Fase 4: URL do Supabase interno do Lovable Cloud (Promo Gifts v4).'),
  ('lovable_anon_key', 'null'::jsonb,
   'Fase 4: ANON KEY do Lovable Cloud. Abner deve preencher manualmente via INSERT antes do primeiro run.')
ON CONFLICT (key) DO NOTHING;

-- 2) Funcao principal - dispara fetch para o Lovable e retorna request_id
CREATE OR REPLACE FUNCTION public.fn_trigger_schema_drift_fetch()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lovable_url text;
  v_lovable_key text;
  v_request_id  bigint;
BEGIN
  -- Le configuracao
  SELECT value #>> '{}' INTO v_lovable_url 
  FROM public.system_settings WHERE key = 'lovable_url';
  SELECT value #>> '{}' INTO v_lovable_key 
  FROM public.system_settings WHERE key = 'lovable_anon_key';

  IF v_lovable_url IS NULL OR v_lovable_url = 'null' THEN
    RAISE EXCEPTION 'lovable_url nao configurado em system_settings';
  END IF;
  IF v_lovable_key IS NULL OR v_lovable_key = 'null' THEN
    RAISE EXCEPTION 'lovable_anon_key nao configurado em system_settings. Preencher via UPDATE system_settings.';
  END IF;

  -- Dispara HTTP POST assincrono para o Lovable RPC
  SELECT net.http_post(
    url     := v_lovable_url || '/rest/v1/rpc/get_public_schema_signatures',
    headers := jsonb_build_object(
      'apikey',        v_lovable_key,
      'Authorization', 'Bearer ' || v_lovable_key,
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_trigger_schema_drift_fetch() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_trigger_schema_drift_fetch() TO service_role;

COMMENT ON FUNCTION public.fn_trigger_schema_drift_fetch() IS
  'Fase 4 2026-05-22: dispara fetch async para Lovable. Retorna request_id para polling.';

-- 3) Funcao de compute_diff + record (recebe lovable signatures, gera diff, grava log)
CREATE OR REPLACE FUNCTION public.fn_compute_and_record_drift(p_lovable_signatures jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_oficial jsonb;
  v_oficial_tables text[];
  v_lovable_tables text[];
  v_only_oficial text[];
  v_only_lovable text[];
  v_schema_diff jsonb := '{}'::jsonb;
  v_table text;
  v_diff_result jsonb;
BEGIN
  -- Signatures do oficial
  v_oficial := public.get_public_schema_signatures();

  -- Sets
  v_oficial_tables := ARRAY(SELECT jsonb_object_keys(v_oficial) ORDER BY 1);
  v_lovable_tables := ARRAY(SELECT jsonb_object_keys(p_lovable_signatures) ORDER BY 1);

  v_only_oficial := ARRAY(
    SELECT k FROM unnest(v_oficial_tables) k 
    WHERE NOT (p_lovable_signatures ? k)
    ORDER BY k
  );
  v_only_lovable := ARRAY(
    SELECT k FROM unnest(v_lovable_tables) k 
    WHERE NOT (v_oficial ? k)
    ORDER BY k
  );

  -- Diff por tabela (presente em ambos mas signatures diferentes)
  FOREACH v_table IN ARRAY v_oficial_tables LOOP
    IF (p_lovable_signatures ? v_table) 
       AND (v_oficial ->> v_table) IS DISTINCT FROM (p_lovable_signatures ->> v_table) THEN
      v_schema_diff := v_schema_diff || jsonb_build_object(
        v_table,
        jsonb_build_object(
          'oficial', v_oficial ->> v_table,
          'lovable', p_lovable_signatures ->> v_table
        )
      );
    END IF;
  END LOOP;

  -- Monta resultado e grava
  v_diff_result := jsonb_build_object(
    'has_drift', (
      array_length(v_only_oficial, 1) > 0 OR
      array_length(v_only_lovable, 1) > 0 OR
      jsonb_object_length(v_schema_diff) > 0
    ),
    'tables_oficial', array_length(v_oficial_tables, 1),
    'tables_lovable', array_length(v_lovable_tables, 1),
    'only_oficial', COALESCE(to_jsonb(v_only_oficial), '[]'::jsonb),
    'only_lovable', COALESCE(to_jsonb(v_only_lovable), '[]'::jsonb),
    'schema_diff', v_schema_diff
  );

  RETURN public.record_schema_drift_result(v_diff_result);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_compute_and_record_drift(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_compute_and_record_drift(jsonb) TO service_role;

COMMENT ON FUNCTION public.fn_compute_and_record_drift(jsonb) IS
  'Fase 4 2026-05-22: recebe signatures do Lovable, compara com as do oficial, grava log e notifica.';

-- 4) Funcao orquestradora que faz tudo (trigger fetch + poll + compute + record)
CREATE OR REPLACE FUNCTION public.fn_run_schema_drift_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request_id   bigint;
  v_response     jsonb;
  v_lovable_sigs jsonb;
  v_log_id       uuid;
  v_attempts     int := 0;
  v_max_attempts int := 30;  -- ate 30s
  v_status_code  int;
BEGIN
  -- Dispara fetch
  v_request_id := public.fn_trigger_schema_drift_fetch();

  -- Polling pelo resultado
  LOOP
    v_attempts := v_attempts + 1;
    PERFORM pg_sleep(1);

    SELECT status_code, content::jsonb
      INTO v_status_code, v_response
      FROM net._http_response
      WHERE id = v_request_id;

    EXIT WHEN v_status_code IS NOT NULL;
    
    IF v_attempts >= v_max_attempts THEN
      -- Timeout: grava erro
      v_log_id := public.record_schema_drift_result(jsonb_build_object(
        'has_drift', false,
        'tables_oficial', 0,
        'tables_lovable', 0,
        'only_oficial', '[]'::jsonb,
        'only_lovable', '[]'::jsonb,
        'schema_diff', '{}'::jsonb,
        'error_message', format('Timeout aguardando Lovable (request_id=%s, %s tentativas)', v_request_id, v_attempts)
      ));
      RETURN jsonb_build_object('ok', false, 'error', 'timeout', 'log_id', v_log_id);
    END IF;
  END LOOP;

  -- Validar resposta
  IF v_status_code != 200 THEN
    v_log_id := public.record_schema_drift_result(jsonb_build_object(
      'has_drift', false,
      'tables_oficial', 0,
      'tables_lovable', 0,
      'only_oficial', '[]'::jsonb,
      'only_lovable', '[]'::jsonb,
      'schema_diff', '{}'::jsonb,
      'error_message', format('Lovable retornou HTTP %s: %s', v_status_code, v_response::text)
    ));
    RETURN jsonb_build_object('ok', false, 'error', 'http_'||v_status_code, 'log_id', v_log_id);
  END IF;

  -- Computa diff e grava
  v_lovable_sigs := v_response;
  v_log_id := public.fn_compute_and_record_drift(v_lovable_sigs);

  RETURN jsonb_build_object('ok', true, 'log_id', v_log_id, 'request_id', v_request_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_run_schema_drift_check() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_run_schema_drift_check() TO service_role;

COMMENT ON FUNCTION public.fn_run_schema_drift_check() IS
  'Fase 4 2026-05-22: orquestrador. Dispara fetch + polling + diff + log. Invocado pelo pg_cron diario.';
