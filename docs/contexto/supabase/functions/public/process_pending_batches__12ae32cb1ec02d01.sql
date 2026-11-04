CREATE OR REPLACE FUNCTION public.process_pending_batches()
 RETURNS TABLE(batch_id uuid, products_processed integer, status text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sup  RECORD;
  v_par  RECORD;
  v_std  jsonb;
  v_prom jsonb;
  v_vp   jsonb;
  v_cnt  integer;
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

  -- Robustez (Fase 9): staging standardized órfão (sem raw pendente).
  FOR v_sup IN
      SELECT DISTINCT x.supplier_id
      FROM (
        SELECT pp.supplier_id FROM public.produtos_padronizacao pp WHERE pp.status='standardized'
        UNION
        SELECT pv2.supplier_id FROM public.produtos_padronizacao_variantes pv2 WHERE pv2.status='standardized'
      ) x
      WHERE NOT EXISTS (
        SELECT 1 FROM public.supplier_products_raw r
        WHERE r.supplier_id = x.supplier_id AND r.status = 'pending'
      )
  LOOP
      -- pads órfãos (promove pai + variantes)
      v_prom := public.fn_promote_supplier(v_sup.supplier_id, NULL);
      v_cnt  := COALESCE((v_prom->>'pais_promovidos')::integer, 0);

      -- variantes órfãs cujo pai JÁ está promoted (fn_promote_supplier não cobre)
      FOR v_par IN
          SELECT DISTINCT pv3.parent_reference
          FROM public.produtos_padronizacao_variantes pv3
          WHERE pv3.supplier_id = v_sup.supplier_id AND pv3.status='standardized'
            AND NULLIF(pv3.parent_reference,'') IS NOT NULL
      LOOP
          v_vp := public.fn_promote_variants_of_parent(v_sup.supplier_id, v_par.parent_reference);
      END LOOP;

      batch_id           := NULL::uuid;
      products_processed := v_cnt;
      status := CASE WHEN COALESCE((v_prom->>'erros')::int,0)=0 THEN 'SUCCESS' ELSE 'PARTIAL' END;
      RETURN NEXT;
  END LOOP;

  RETURN;
END;
$function$
