CREATE OR REPLACE FUNCTION public.fn_refresh_supplier_sync_timestamps()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_updated int := 0;
BEGIN
  WITH updated AS (
    UPDATE suppliers s
    SET last_full_sync_at = vss_agg.max_sync
    FROM (
      SELECT supplier_id, MAX(last_synced_at) AS max_sync
      FROM variant_supplier_sources
      GROUP BY supplier_id
    ) vss_agg
    WHERE s.id = vss_agg.supplier_id
      AND s.sync_enabled = true
      AND (s.last_full_sync_at IS NULL OR s.last_full_sync_at < vss_agg.max_sync - INTERVAL '30 minutes')
    RETURNING s.id
  )
  SELECT COUNT(*) INTO v_updated FROM updated;

  RETURN jsonb_build_object('suppliers_updated', v_updated, 'executed_at', NOW());
END;
$function$
