
-- ===================================================================
-- FIX: Ponte entre schema_signature_drift_log (local, funciona) e
-- schema_drift_log (Lovable HTTP, morto). A partir de agora o
-- schema_drift_log mostra dados reais vindos do check local, nunca mais
-- timeouts falsos.
--
-- fix_version: drift_log_bridge_v1_20260627
-- ===================================================================
CREATE OR REPLACE FUNCTION public.fn_sync_local_drift_to_schema_drift_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rec RECORD;
  v_only_oficial text[];
  v_only_lovable  text[];
BEGIN
  -- fix_version: drift_log_bridge_v1_20260627
  -- Busca a entrada mais recente de schema_signature_drift_log (check local)
  SELECT * INTO v_rec
  FROM schema_signature_drift_log
  ORDER BY ran_at DESC
  LIMIT 1;

  IF v_rec IS NULL THEN
    RETURN;
  END IF;

  -- Mapeia: tabelas adicionadas ao schema real = "only_oficial" (existem no
  -- Supabase oficial mas não no ponto de referência anterior).
  -- Tabelas removidas = "only_lovable" (estavam e sumiram).
  v_only_oficial := COALESCE(v_rec.tables_added, '{}');
  v_only_lovable  := COALESCE(v_rec.tables_removed, '{}');

  INSERT INTO schema_drift_log (
    ran_at,
    has_drift,
    tables_oficial,
    tables_lovable,
    only_oficial,
    only_lovable,
    schema_diff,
    notification_sent,
    error_message
  )
  VALUES (
    now(),
    v_rec.has_drift,
    (SELECT COUNT(DISTINCT table_name)
     FROM information_schema.tables
     WHERE table_schema = 'public'),
    (SELECT COUNT(DISTINCT table_name)
     FROM schema_signature_baseline),
    v_only_oficial,
    v_only_lovable,
    jsonb_build_object(
      'source',          'fn_check_schema_signature_drift',
      'baseline_label',  v_rec.baseline_label,
      'n_added',         v_rec.n_added,
      'n_removed',       v_rec.n_removed,
      'n_retyped',       v_rec.n_retyped,
      'columns_added',   v_rec.columns_added,
      'columns_removed', v_rec.columns_removed,
      'columns_retyped', v_rec.columns_retyped,
      'note',
        'Dados do check local (não HTTP Lovable) — bridged por fn_sync_local_drift_to_schema_drift_log'
    ),
    false,
    NULL  -- sem erro: veio do check local que funciona
  );
END;
$function$;

-- Chamar imediatamente para popular schema_drift_log com dados reais
SELECT public.fn_sync_local_drift_to_schema_drift_log();
;
