-- Fase 9 / fixes expostos pelo passo de robustez (erros reais presos em silêncio):
-- (1) fn_promote_variants_of_parent: limpa process_errors ao marcar raw processed
--     (respeita chk_spr_no_processed_with_errors) e só grava VSS com cost_price > 0
--     (respeita chk_vss_cost_price_not_zero; custo 0 do fornecedor = sem source de custo).
-- (2) process_pending_batches: no passo de robustez, também promove VARIANTES órfãs
--     standardized cujo pai já está promoted (fn_promote_supplier não as cobre).

CREATE OR REPLACE FUNCTION public.fn_promote_variants_of_parent(
    p_supplier_id uuid,
    p_parent_reference text
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_pid uuid; v_org uuid; pv RECORD; v_vid uuid; v_count int := 0; v_attrs jsonb;
  v_existing_pid uuid;
BEGIN
  PERFORM set_config('app.write_source','pipeline',true);
  SELECT id, organization_id INTO v_pid, v_org FROM public.products
  WHERE supplier_id=p_supplier_id AND supplier_reference=p_parent_reference;
  IF v_pid IS NULL THEN RETURN jsonb_build_object('success',false,'error','produto_pai_nao_promovido','parent',p_parent_reference); END IF;

  FOR pv IN
    SELECT * FROM public.produtos_padronizacao_variantes
    WHERE supplier_id=p_supplier_id AND parent_reference=p_parent_reference AND status='standardized'
  LOOP
    v_attrs := jsonb_strip_nulls(jsonb_build_object('cor', pv.color_name, 'codigo_cor', pv.color_code, 'hex', pv.color_hex));

    SELECT id, product_id INTO v_vid, v_existing_pid FROM public.product_variants WHERE sku = pv.sku;
    IF v_vid IS NULL THEN
      SELECT id, product_id INTO v_vid, v_existing_pid FROM public.product_variants
      WHERE product_id=v_pid AND supplier_sku=pv.supplier_sku;
    END IF;

    IF v_vid IS NULL THEN
      INSERT INTO public.product_variants (product_id, sku, supplier_sku, name, attributes, color_name, color_code, color_hex, color_id, stock_quantity, is_active, last_sync_at, last_sync_supplier_id)
      VALUES (v_pid, pv.sku, pv.supplier_sku, COALESCE(pv.color_name, pv.sku), v_attrs,
              pv.color_name, pv.color_code, pv.color_hex, pv.color_id,
              COALESCE(pv.stock_quantity,0), COALESCE(pv.is_active,true), now(), p_supplier_id)
      ON CONFLICT (sku) DO UPDATE SET
        supplier_sku = EXCLUDED.supplier_sku,
        attributes   = COALESCE(public.product_variants.attributes,'{}'::jsonb) || EXCLUDED.attributes,
        color_name   = COALESCE(EXCLUDED.color_name, public.product_variants.color_name),
        color_code   = COALESCE(EXCLUDED.color_code, public.product_variants.color_code),
        color_hex    = COALESCE(EXCLUDED.color_hex, public.product_variants.color_hex),
        color_id     = COALESCE(EXCLUDED.color_id, public.product_variants.color_id),
        stock_quantity = COALESCE(EXCLUDED.stock_quantity, public.product_variants.stock_quantity),
        last_sync_at = now(), last_sync_supplier_id = EXCLUDED.last_sync_supplier_id
      RETURNING id INTO v_vid;
    ELSE
      UPDATE public.product_variants SET
        attributes = COALESCE(attributes,'{}'::jsonb) || v_attrs,
        color_name=COALESCE(pv.color_name,color_name), color_code=COALESCE(pv.color_code,color_code),
        color_hex=COALESCE(pv.color_hex,color_hex), color_id=COALESCE(pv.color_id,color_id),
        stock_quantity=COALESCE(pv.stock_quantity,stock_quantity), last_sync_at=now(), last_sync_supplier_id=p_supplier_id
      WHERE id=v_vid;
    END IF;

    -- FIX (chk_vss_cost_price_not_zero): só grava source de custo quando custo > 0.
    IF pv.cost_price IS NOT NULL AND pv.cost_price > 0 THEN
      INSERT INTO public.variant_supplier_sources (organization_id, variant_id, supplier_id, cost_price, supplier_sku, supplier_color_code, supplier_color_name, is_active, source, last_synced_at)
      VALUES (v_org, v_vid, p_supplier_id, pv.cost_price, pv.supplier_sku, pv.color_code, pv.color_name, true, 'silver', now())
      ON CONFLICT (variant_id, supplier_id) DO UPDATE SET
        cost_price          = EXCLUDED.cost_price,
        supplier_sku        = EXCLUDED.supplier_sku,
        supplier_color_code = EXCLUDED.supplier_color_code,
        supplier_color_name = EXCLUDED.supplier_color_name,
        is_active           = EXCLUDED.is_active,
        source              = EXCLUDED.source,
        last_synced_at      = EXCLUDED.last_synced_at;
    END IF;

    UPDATE public.produtos_padronizacao_variantes SET status='promoted', variant_id=v_vid, updated_at=now() WHERE id=pv.id;

    -- 3-fases: raw concluída ao chegar no Gold. FIX: limpa process_errors
    -- (promoção bem-sucedida supera erro anterior; respeita chk_spr_no_processed_with_errors).
    IF pv.raw_id IS NOT NULL THEN
      UPDATE public.supplier_products_raw
         SET status='processed', processed_at=now(), product_id=v_pid, variant_id=v_vid,
             process_errors=NULL
       WHERE id=pv.raw_id AND status <> 'processed';
    END IF;

    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('success',true,'product_id',v_pid,'variantes_promovidas',v_count);
END;
$function$;

-- (2) cron: robustez também para variantes órfãs (pai já promoted)
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
$function$;

COMMENT ON FUNCTION public.process_pending_batches() IS
  'Cron de ingestao (*/5). Pipeline Medallion 3 fases (standardize+promote) + robustez (Fase 9): promove staging standardized orfao, incluindo variantes cujo pai ja esta promoted.';;
