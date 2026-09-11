-- UNIFICAÇÃO MEDALLION — Fase 2/4: religa o cron para o pipeline de 3 fases.
CREATE OR REPLACE FUNCTION public.process_pending_batches()
RETURNS TABLE(batch_id uuid, products_processed integer, status text)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_sup  RECORD;
  v_std  jsonb;
  v_prom jsonb;
BEGIN
  FOR v_sup IN
      SELECT ss.supplier_id
      FROM public.supplier_settings ss
      WHERE COALESCE(ss.auto_sync_enabled, false) = true
        AND EXISTS (
          SELECT 1 FROM public.supplier_products_raw r
          WHERE r.supplier_id = ss.supplier_id AND r.status = 'pending'
        )
  LOOP
      v_std  := public.fn_standardize_supplier(v_sup.supplier_id, 1000);
      v_prom := public.fn_promote_supplier(v_sup.supplier_id, NULL);

      batch_id           := NULL::uuid;
      products_processed := COALESCE((v_prom->>'pais_promovidos')::integer, 0);
      status := CASE
                  WHEN COALESCE((v_std->>'erros')::int, 0) = 0
                   AND COALESCE((v_prom->>'erros')::int, 0) = 0 THEN 'SUCCESS'
                  ELSE 'PARTIAL'
                END;
      RETURN NEXT;
  END LOOP;
  RETURN;
END;
$function$;

COMMENT ON FUNCTION public.process_pending_batches() IS
  'Cron de ingestao (*/5). Pipeline Medallion 3 fases por fornecedor auto_sync: fn_standardize_supplier (Bronze->Silver) + fn_promote_supplier (Silver->Gold). Substitui o atalho fn_process_raw_v2 (Bronze->Gold direto). 2026-06-05.';;
