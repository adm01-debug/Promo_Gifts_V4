
-- ===================================================================
-- PATCH: fn_capture_schema_baseline → respeitar schema_signature_drift_allowlist
-- fix_version: baseline_capture_allowlist_aware_v2_20260627
-- ===================================================================
CREATE OR REPLACE FUNCTION public.fn_capture_schema_baseline(
  p_label text DEFAULT 'manual'::text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  -- fix_version: baseline_capture_allowlist_aware_v2_20260627
  -- PATCH 2026-06-27: exclui tabelas na schema_signature_drift_allowlist
  --   (coluna IS NULL = exclusão de tabela inteira) para manter o baseline
  --   limpo de objetos de teste/infra que não devem ser monitorados.
  DELETE FROM public.schema_signature_baseline;

  INSERT INTO public.schema_signature_baseline
    (table_name, column_name, data_type, baseline_label, captured_at)
  SELECT
    c.table_name, c.column_name, c.data_type, p_label, now()
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name NOT LIKE 'pg_%'
    AND c.table_name NOT LIKE '_backup_%'
    -- excluir tabelas/views inteiras da allowlist
    AND c.table_name NOT IN (
      SELECT a.table_name
      FROM public.schema_signature_drift_allowlist a
      WHERE a.column_name IS NULL
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;
;
