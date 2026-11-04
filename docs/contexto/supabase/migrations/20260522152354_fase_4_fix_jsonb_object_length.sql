-- Fix: substituir jsonb_object_length pela alternativa portavel
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
  v_diff_count integer := 0;
  v_table text;
  v_diff_result jsonb;
BEGIN
  v_oficial := public.get_public_schema_signatures();

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
      v_diff_count := v_diff_count + 1;
    END IF;
  END LOOP;

  v_diff_result := jsonb_build_object(
    'has_drift', (
      COALESCE(array_length(v_only_oficial, 1), 0) > 0 OR
      COALESCE(array_length(v_only_lovable, 1), 0) > 0 OR
      v_diff_count > 0
    ),
    'tables_oficial', COALESCE(array_length(v_oficial_tables, 1), 0),
    'tables_lovable', COALESCE(array_length(v_lovable_tables, 1), 0),
    'only_oficial', COALESCE(to_jsonb(v_only_oficial), '[]'::jsonb),
    'only_lovable', COALESCE(to_jsonb(v_only_lovable), '[]'::jsonb),
    'schema_diff', v_schema_diff
  );

  RETURN public.record_schema_drift_result(v_diff_result);
END;
$$;

-- Tambem corrige record_schema_drift_result se usar jsonb_object_length
CREATE OR REPLACE FUNCTION public.record_schema_drift_result(p_result jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log_id        uuid;
  v_has_drift     boolean;
  v_only_oficial  text[];
  v_only_lovable  text[];
  v_schema_diff   jsonb;
  v_diff_count    integer;
  v_notify_count  integer := 0;
BEGIN
  v_has_drift    := COALESCE((p_result->>'has_drift')::boolean, false);
  v_only_oficial := COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_result->'only_oficial')), ARRAY[]::text[]);
  v_only_lovable := COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_result->'only_lovable')), ARRAY[]::text[]);
  v_schema_diff  := COALESCE(p_result->'schema_diff', '{}'::jsonb);
  v_diff_count   := (SELECT COUNT(*) FROM jsonb_object_keys(v_schema_diff));

  INSERT INTO public.schema_drift_log (
    has_drift, tables_oficial, tables_lovable,
    only_oficial, only_lovable, schema_diff,
    error_message
  ) VALUES (
    v_has_drift,
    COALESCE((p_result->>'tables_oficial')::integer, 0),
    COALESCE((p_result->>'tables_lovable')::integer, 0),
    v_only_oficial,
    v_only_lovable,
    v_schema_diff,
    NULLIF(p_result->>'error_message', '')
  )
  RETURNING id INTO v_log_id;

  IF v_has_drift THEN
    INSERT INTO public.workspace_notifications (
      user_id, title, message, type, category, metadata
    )
    SELECT 
      ur.user_id,
      'Schema drift detectado',
      format('Schema do Lovable e do Oficial divergem. only_oficial: %s; only_lovable: %s; tables com diff: %s',
        COALESCE(array_length(v_only_oficial, 1), 0),
        COALESCE(array_length(v_only_lovable, 1), 0),
        v_diff_count
      ),
      'warning',
      'system',
      jsonb_build_object(
        'log_id', v_log_id,
        'source', 'schema-drift-check',
        'only_oficial', v_only_oficial,
        'only_lovable', v_only_lovable,
        'tables_with_drift', (SELECT array_agg(k) FROM jsonb_object_keys(v_schema_diff) k)
      )
    FROM public.user_roles ur
    WHERE ur.role = 'admin';

    GET DIAGNOSTICS v_notify_count = ROW_COUNT;

    UPDATE public.schema_drift_log
    SET notification_sent = (v_notify_count > 0)
    WHERE id = v_log_id;
  END IF;

  RETURN v_log_id;
END;
$$;
