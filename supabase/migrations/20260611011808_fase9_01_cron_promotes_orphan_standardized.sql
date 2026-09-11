-- ITEM A — Robustez: process_pending_batches também promove staging órfão.
-- Caso raro (race) visto em validação: pad/padvar 'standardized' com raw já 'processed'
-- → não havia raw pendente, o cron pulava o fornecedor e o staging ficava preso até o
-- próximo import. Agora: além do fluxo normal, um segundo passo promove fornecedores
-- com staging standardized SEM raw pendente. Idempotente; advisory locks preservados.
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
  -- Fluxo principal: fornecedores auto_sync com raw pendente (Bronze→Silver→Gold)
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

  -- Robustez (Fase 9): staging órfão — pad/padvar standardized SEM raw pendente.
  FOR v_sup IN
      SELECT DISTINCT x.supplier_id
      FROM (
        SELECT supplier_id FROM public.produtos_padronizacao WHERE status='standardized'
        UNION
        SELECT supplier_id FROM public.produtos_padronizacao_variantes WHERE status='standardized'
      ) x
      WHERE NOT EXISTS (
        SELECT 1 FROM public.supplier_products_raw r
        WHERE r.supplier_id = x.supplier_id AND r.status = 'pending'
      )
  LOOP
      v_prom := public.fn_promote_supplier(v_sup.supplier_id, NULL);
      batch_id           := NULL::uuid;
      products_processed := COALESCE((v_prom->>'pais_promovidos')::integer, 0);
      status := CASE WHEN COALESCE((v_prom->>'erros')::int,0)=0 THEN 'SUCCESS' ELSE 'PARTIAL' END;
      RETURN NEXT;
  END LOOP;

  RETURN;
END;
$function$;

COMMENT ON FUNCTION public.process_pending_batches() IS
  'Cron de ingestao (*/5). Pipeline Medallion 3 fases por fornecedor auto_sync (standardize+promote) + passo de robustez (Fase 9): promove staging standardized orfao (sem raw pendente). Substitui o atalho fn_process_raw_v2.';;
