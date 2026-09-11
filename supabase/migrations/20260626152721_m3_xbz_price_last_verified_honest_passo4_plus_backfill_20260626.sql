-- ============================================================================
-- MELHORIA 3 (price freshness honesto) — 2026-06-26
-- fix_version = price_freshness_honest_v1
-- PROBLEMA: 224 produtos XBZ apareciam com is_price_stale=true (badge
--   v_product_active_badge) apesar de o produto ser reconfirmado na API XBZ a
--   cada <=12h. Causa: o badge lê products.price_last_verified_at, que só era
--   carimbado pelo trigger trg_update_price_last_verified quando last_sync_at OU
--   price_updated_at mudavam. O stock-sync XBZ grava product_variants.last_sync_at
--   (não products.last_sync_at) e só bumpa products.price_verified_at (coluna
--   DIFERENTE). Para produtos de preço ESTÁVEL (>60d sem mudança), nada bumpava
--   price_last_verified_at -> falso-positivo de "preço velho".
-- FIX: o PASSO 4 (rollup, roda a cada <=12h por produto) passa a carimbar TAMBÉM
--   price_last_verified_at=now(), ao lado de price_verified_at. Blast radius
--   mínimo: price_last_verified_at é lido SOMENTE por v_product_active_badge.
-- PROVA: dry-run 1 (224->0) + dry-run 2 (réplica real do PASSO 4, 224->0).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_import_stock_xbz(p_parent_reference text DEFAULT NULL::text)
 RETURNS TABLE(vss_atualizadas integer, bronze_fechadas integer, produtos_rollup integer, bronze_sem_vss integer, details jsonb)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_supplier_id uuid;
  v_updated int := 0; v_closed int := 0; v_rollup int := 0; v_skipped int := 0;
  v_pv_updated int := 0;
BEGIN
  SELECT id INTO v_supplier_id FROM public.suppliers WHERE code='XBZ' LIMIT 1;
  IF v_supplier_id IS NULL THEN RAISE EXCEPTION 'Fornecedor XBZ nao encontrado'; END IF;

  -- PASSO 1: Bronze → VSS (stock + next_date_1 com sentinela filtrada)
  WITH src AS (
    SELECT spr.supplier_sku,
           GREATEST(COALESCE(NULLIF(spr.stock_data->>'Quantity','')::int,0),0) AS q,
           NULLIF(NULLIF(LEFT(COALESCE(spr.stock_data->>'NextDate1',''),10),'0001-01-01'),'')::date AS nd1
    FROM public.supplier_products_raw spr
    WHERE spr.supplier_id=v_supplier_id AND spr.stock_data ? 'Quantity'
      AND (p_parent_reference IS NULL OR spr.supplier_reference=p_parent_reference)
  ),
  upd AS (
    UPDATE public.variant_supplier_sources vss
       SET quantity=src.q, stock_main_warehouse=src.q, stock_other_warehouses=0,
           next_date_1     = CASE WHEN src.nd1 IS NOT NULL AND COALESCE(vss.next_quantity_1,0)>0
                                  THEN src.nd1 ELSE NULL END,
           next_quantity_1 = CASE WHEN src.nd1 IS NOT NULL AND COALESCE(vss.next_quantity_1,0)>0
                                  THEN vss.next_quantity_1 ELSE NULL END,
           last_synced_at=now(), sync_status='synced',
           sync_error=NULL, source='xbz_api', updated_at=now()
    FROM src
    WHERE vss.supplier_id=v_supplier_id AND vss.supplier_sku=src.supplier_sku
      AND (
        vss.quantity IS DISTINCT FROM src.q
        OR vss.next_date_1 IS DISTINCT FROM
           CASE WHEN src.nd1 IS NOT NULL AND COALESCE(vss.next_quantity_1,0)>0
                THEN src.nd1 ELSE NULL END
        OR (src.nd1 IS NULL AND COALESCE(vss.next_quantity_1, 0) > 0)
        OR (src.nd1 IS NOT NULL AND COALESCE(vss.next_quantity_1,0)=0 AND vss.next_date_1 IS NOT NULL)
      )
    RETURNING vss.id
  )
  SELECT count(*) INTO v_updated FROM upd;

  -- PASSO 2: VSS → product_variants
  PERFORM set_config('app.bulk_import_mode', 'true', true);
  WITH src AS (
    SELECT spr.supplier_sku,
           GREATEST(COALESCE(NULLIF(spr.stock_data->>'Quantity','')::int,0),0) AS q,
           NULLIF(NULLIF(LEFT(COALESCE(spr.stock_data->>'NextDate1',''),10),'0001-01-01'),'')::date AS nd1
    FROM public.supplier_products_raw spr
    WHERE spr.supplier_id=v_supplier_id AND spr.stock_data ? 'Quantity'
      AND (p_parent_reference IS NULL OR spr.supplier_reference=p_parent_reference)
  )
  UPDATE public.product_variants pv
  SET stock_quantity  = src.q,
      next_date_1     = CASE WHEN src.nd1 IS NOT NULL AND COALESCE(vss2.next_quantity_1,0)>0
                             THEN src.nd1 ELSE NULL END,
      next_quantity_1 = CASE WHEN src.nd1 IS NOT NULL AND COALESCE(vss2.next_quantity_1,0)>0
                             THEN vss2.next_quantity_1 ELSE NULL END,
      last_sync_at    = now()
  FROM src
  JOIN public.variant_supplier_sources vss2
    ON vss2.supplier_sku = src.supplier_sku
   AND vss2.supplier_id  = v_supplier_id
   AND vss2.is_active    = true
  WHERE pv.supplier_sku = src.supplier_sku
    AND pv.is_active    = true
    AND (
      pv.stock_quantity IS DISTINCT FROM src.q
      OR pv.next_date_1 IS DISTINCT FROM
         CASE WHEN src.nd1 IS NOT NULL AND COALESCE(vss2.next_quantity_1,0)>0
              THEN src.nd1 ELSE NULL END
      OR pv.next_quantity_1 IS DISTINCT FROM
         CASE WHEN src.nd1 IS NOT NULL AND COALESCE(vss2.next_quantity_1,0)>0
              THEN vss2.next_quantity_1 ELSE NULL END
    );
  GET DIAGNOSTICS v_pv_updated = ROW_COUNT;

  -- PASSO 3: Fechar Bronze processados
  WITH closed AS (
    UPDATE public.supplier_products_raw spr
       SET stock_status='processed', stock_synced_at=now()
    WHERE spr.supplier_id=v_supplier_id AND spr.stock_data ? 'Quantity'
      AND (p_parent_reference IS NULL OR spr.supplier_reference=p_parent_reference)
      AND spr.stock_status IS DISTINCT FROM 'processed'
      AND EXISTS (SELECT 1 FROM public.variant_supplier_sources vss
                  WHERE vss.supplier_id=v_supplier_id AND vss.supplier_sku=spr.supplier_sku)
    RETURNING spr.id
  )
  SELECT count(*) INTO v_closed FROM closed;

  -- PASSO 4: Rollup produto-pai
  WITH agg AS (
    SELECT p2.id, COALESCE(SUM(pv.stock_quantity),0) AS sum_v
    FROM public.products p2
    LEFT JOIN public.product_variants pv ON pv.product_id=p2.id AND pv.is_active=true
    WHERE p2.supplier_id=v_supplier_id
      AND (p_parent_reference IS NULL OR p2.supplier_reference=p_parent_reference)
    GROUP BY p2.id
  ),
  rollup AS (
    UPDATE public.products p
       SET stock_quantity=agg.sum_v, is_stockout=(agg.sum_v<=0),
           last_stock_update_at=now(), price_verified_at=now(),
           -- FIX M3 2026-06-26 (fix_version=price_freshness_honest_v1):
           -- carimbar TAMBÉM price_last_verified_at (lido por v_product_active_badge).
           -- O rollup roda a cada <=12h por produto e reconfirma os dados do
           -- fornecedor; sem este carimbo, produtos de preço ESTÁVEL (>60d sem
           -- mudança) apareciam como is_price_stale=true (falso-positivo).
           -- ANTI-REGRESSAO: NAO remover esta linha — mantém o badge de frescor honesto.
           price_last_verified_at=now()
    FROM agg WHERE p.id=agg.id
      AND (p.stock_quantity IS DISTINCT FROM agg.sum_v
        OR p.is_stockout IS DISTINCT FROM (agg.sum_v<=0)
        OR p.price_verified_at IS NULL
        OR p.price_verified_at < now() - INTERVAL '12 hours')
    RETURNING p.id
  )
  SELECT count(*) INTO v_rollup FROM rollup;

  SELECT count(*) INTO v_skipped
  FROM public.supplier_products_raw spr
  WHERE spr.supplier_id=v_supplier_id AND spr.stock_data ? 'Quantity'
    AND (p_parent_reference IS NULL OR spr.supplier_reference=p_parent_reference)
    AND NOT EXISTS (SELECT 1 FROM public.variant_supplier_sources vss
                    WHERE vss.supplier_id=v_supplier_id AND vss.supplier_sku=spr.supplier_sku);

  -- HEARTBEAT FIX 2026-06-22: Atualiza last_full_sync_at SEMPRE (independente de mudanças)
  -- Permite que v_system_alerts detecte corretamente se o sync está rodando
  UPDATE public.suppliers
    SET last_full_sync_at = now(), last_sync_status = 'completed'
  WHERE id = v_supplier_id;

  RETURN QUERY SELECT v_updated, v_closed, v_rollup, v_skipped,
    jsonb_build_object(
      'supplier_id', v_supplier_id,
      'scope', COALESCE(p_parent_reference,'ALL'),
      'pv_updated', v_pv_updated,
      'fixes', jsonb_build_array(
        'nd1_null_clears_nq1_residual',
        'pv_is_active_guard',
        'nd1_only_when_nq1_positive',
        'heartbeat_last_full_sync_at',
        'price_last_verified_at_honest_v1'  -- NOVO: badge de frescor honesto (M3)
      )
    );
END;
$function$;

-- ----------------------------------------------------------------------------
-- BACKFILL ÚNICO: zerar os 224 falsos-positivos XBZ existentes imediatamente
-- (o fix acima os mantém frescos a partir de agora; este UPDATE limpa o backlog)
-- ----------------------------------------------------------------------------
UPDATE public.products
   SET price_last_verified_at = now()
 WHERE supplier_id = (SELECT id FROM public.suppliers WHERE code='XBZ' LIMIT 1)
   AND is_active = true
   AND price_last_verified_at IS NOT NULL
   AND (EXTRACT(epoch FROM now() - price_last_verified_at)/86400)
       > COALESCE(price_freshness_threshold_days, 60);

NOTIFY pgrst, 'reload schema';;
