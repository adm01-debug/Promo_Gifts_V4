CREATE OR REPLACE FUNCTION public.fn_compute_and_record_drift(p_lovable_signatures jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_oficial_sigs  jsonb;
  v_only_oficial  text[];
  v_only_lovable  text[];
  v_diff          jsonb := '{}'::jsonb;
  v_has_drift     boolean;
  v_tab_oficial   int;
  v_tab_lovable   int;
  v_log_payload   jsonb;
  v_allowed       text[];
BEGIN
  SELECT array_agg(table_name) INTO v_allowed FROM public.schema_drift_allowlist;
  v_allowed := COALESCE(v_allowed, ARRAY[]::text[]);

  v_oficial_sigs := public.get_public_schema_signatures();

  SELECT array_agg(k ORDER BY k) INTO v_only_oficial
    FROM jsonb_object_keys(v_oficial_sigs) k
   WHERE NOT (p_lovable_signatures ? k) AND k != ALL(v_allowed);

  SELECT array_agg(k ORDER BY k) INTO v_only_lovable
    FROM jsonb_object_keys(p_lovable_signatures) k
   WHERE NOT (v_oficial_sigs ? k) AND k != ALL(v_allowed);

  SELECT jsonb_object_agg(k, jsonb_build_object('oficial', v_oficial_sigs -> k,
                                                'lovable', p_lovable_signatures -> k))
    INTO v_diff
    FROM jsonb_object_keys(v_oficial_sigs) k
   WHERE p_lovable_signatures ? k
     AND (v_oficial_sigs -> k) <> (p_lovable_signatures -> k)
     AND k != ALL(v_allowed);

  v_diff := COALESCE(v_diff, '{}'::jsonb);
  v_tab_oficial := (SELECT COUNT(*) FROM jsonb_object_keys(v_oficial_sigs));
  v_tab_lovable := (SELECT COUNT(*) FROM jsonb_object_keys(p_lovable_signatures));

  -- has_drift CORRIGIDO: só considera divergências que importam (Lovable é subset esperado)
  v_has_drift := (COALESCE(array_length(v_only_lovable, 1), 0) > 0
                  OR (SELECT COUNT(*) FROM jsonb_object_keys(v_diff)) > 0);

  v_log_payload := jsonb_build_object(
    'has_drift',         v_has_drift,
    'tables_oficial',    v_tab_oficial,
    'tables_lovable',    v_tab_lovable,
    'only_oficial',      COALESCE(to_jsonb(v_only_oficial), '[]'::jsonb),
    'only_lovable',      COALESCE(to_jsonb(v_only_lovable), '[]'::jsonb),
    'schema_diff',       v_diff,
    'allowlist_applied', to_jsonb(v_allowed)
  );

  RETURN public.record_schema_drift_result(v_log_payload);
END;
$function$
