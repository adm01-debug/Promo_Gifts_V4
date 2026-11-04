CREATE OR REPLACE FUNCTION public.fn_xbz_stock_fast_sync(p_supplier_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_variants_updated int := 0;
  v_vss_updated      int := 0;
  v_t0               timestamptz := clock_timestamp();
BEGIN
  -- UPDATE 1: product_variants (gold layer principal)
  -- JOIN: supplier_products_raw → produtos_padronizacao_variantes → product_variants
  UPDATE product_variants pv
  SET
    stock_quantity       = (spr.raw_data->>'QuantidadeDisponivel')::numeric,
    last_sync_at         = now(),
    last_sync_supplier_id = p_supplier_id
  FROM supplier_products_raw spr
  JOIN produtos_padronizacao_variantes ppv
    ON ppv.raw_id = spr.id
  WHERE spr.supplier_id  = p_supplier_id
    AND ppv.variant_id   = pv.id
    AND ppv.variant_id   IS NOT NULL
    AND spr.raw_data     ? 'QuantidadeDisponivel'
    AND (spr.raw_data->>'QuantidadeDisponivel') IS NOT NULL;

  GET DIAGNOSTICS v_variants_updated = ROW_COUNT;

  -- UPDATE 2: variant_supplier_sources (stock + custo por fornecedor)
  UPDATE variant_supplier_sources vss
  SET
    quantity             = (spr.raw_data->>'QuantidadeDisponivel')::numeric,
    stock_main_warehouse = (spr.raw_data->>'QuantidadeDisponivel')::numeric,
    cost_price           = COALESCE(
                             NULLIF((spr.raw_data->>'PrecoVenda')::numeric, 0),
                             vss.cost_price
                           ),
    last_synced_at       = now()
  FROM supplier_products_raw spr
  JOIN produtos_padronizacao_variantes ppv
    ON ppv.raw_id = spr.id
  WHERE spr.supplier_id  = p_supplier_id
    AND vss.variant_id   = ppv.variant_id
    AND vss.supplier_id  = p_supplier_id
    AND ppv.variant_id   IS NOT NULL
    AND spr.raw_data     ? 'QuantidadeDisponivel'
    AND (spr.raw_data->>'QuantidadeDisponivel') IS NOT NULL;

  GET DIAGNOSTICS v_vss_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success',           true,
    'supplier_id',       p_supplier_id,
    'variants_updated',  v_variants_updated,
    'vss_updated',       v_vss_updated,
    'segundos',          round(extract(epoch FROM clock_timestamp() - v_t0)::numeric, 2),
    'ts',                now()
  );
END;
$function$
