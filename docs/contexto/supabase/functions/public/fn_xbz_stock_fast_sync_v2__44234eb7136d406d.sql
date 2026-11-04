CREATE OR REPLACE FUNCTION public.fn_xbz_stock_fast_sync_v2(p_supplier_id uuid, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '60s'
AS $function$
DECLARE
  v_vss_updated      int := 0;
  v_variants_updated int := 0;
  v_t0               timestamptz := clock_timestamp();
BEGIN
  -- UPDATE 1: variant_supplier_sources
  -- JOIN direto: F2.CodigoComposto → vss.supplier_sku (1 nível, index disponível)
  WITH f2_data AS (
    SELECT
      item->>'CodigoComposto' AS sku,
      GREATEST(0, (item->>'QuantidadeDisponivel')::numeric) AS qty,
      COALESCE(NULLIF((item->>'PrecoVenda')::numeric, 0), NULL) AS preco
    FROM jsonb_array_elements(p_items) item
    WHERE (item->>'CodigoComposto') IS NOT NULL
      AND (item->>'QuantidadeDisponivel') IS NOT NULL
  )
  UPDATE variant_supplier_sources vss
  SET
    quantity             = f2.qty,
    stock_main_warehouse = f2.qty,
    cost_price           = COALESCE(f2.preco, vss.cost_price),
    last_synced_at       = now()
  FROM f2_data f2
  WHERE vss.supplier_sku = f2.sku
    AND vss.supplier_id  = p_supplier_id;

  GET DIAGNOSTICS v_vss_updated = ROW_COUNT;

  -- UPDATE 2: product_variants
  -- stock_quantity = soma dos estoques das variantes do mesmo pai
  WITH f2_parent AS (
    SELECT
      item->>'CodigoAmigavel' AS parent_ref,
      SUM(GREATEST(0, (item->>'QuantidadeDisponivel')::numeric)) AS total_qty
    FROM jsonb_array_elements(p_items) item
    WHERE (item->>'CodigoAmigavel') IS NOT NULL
      AND (item->>'QuantidadeDisponivel') IS NOT NULL
    GROUP BY item->>'CodigoAmigavel'
  )
  UPDATE product_variants pv
  SET
    stock_quantity        = f2p.total_qty,
    last_sync_at          = now(),
    last_sync_supplier_id = p_supplier_id
  FROM f2_parent f2p
  JOIN supplier_products_raw spr
    ON spr.supplier_reference = f2p.parent_ref
   AND spr.supplier_id        = p_supplier_id
  WHERE pv.id = spr.product_id
    AND spr.product_id IS NOT NULL;

  GET DIAGNOSTICS v_variants_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success',          true,
    'supplier_id',      p_supplier_id,
    'vss_updated',      v_vss_updated,
    'variants_updated', v_variants_updated,
    'segundos',         round(extract(epoch FROM clock_timestamp() - v_t0)::numeric, 2),
    'ts',               now()
  );
END;
$function$
