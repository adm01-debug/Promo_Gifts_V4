CREATE OR REPLACE FUNCTION public.fn_xbz_stock_fast_sync_v3(p_supplier_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '120s'
AS $function$
DECLARE
  v_vss_updated      int := 0;
  v_variants_updated int := 0;
  v_t0               timestamptz := clock_timestamp();
BEGIN
  -- 1) Atualiza variant_supplier_sources via CTE (JSONB extraído 1x por linha)
  WITH raw_vals AS (
    SELECT
      supplier_sku,
      GREATEST(0, (raw_data->>'QuantidadeDisponivel')::numeric) AS qty,
      NULLIF((raw_data->>'PrecoVenda')::numeric, 0)             AS preco
    FROM supplier_products_raw
    WHERE supplier_id = p_supplier_id
      AND (raw_data->>'QuantidadeDisponivel') IS NOT NULL
  )
  UPDATE variant_supplier_sources vss
  SET
    quantity             = rv.qty,
    stock_main_warehouse = rv.qty,
    cost_price           = COALESCE(rv.preco, vss.cost_price),
    last_synced_at       = now()
  FROM raw_vals rv
  WHERE vss.supplier_sku = rv.supplier_sku
    AND vss.supplier_id  = p_supplier_id
    AND (
      vss.quantity IS DISTINCT FROM rv.qty
      OR (rv.preco IS NOT NULL AND vss.cost_price IS DISTINCT FROM rv.preco)
    );
  GET DIAGNOSTICS v_vss_updated = ROW_COUNT;

  -- 2) Atualiza product_variants via variant_id (JSONB extraído 1x por linha)
  WITH raw_vals AS (
    SELECT
      variant_id,
      GREATEST(0, (raw_data->>'QuantidadeDisponivel')::numeric) AS qty
    FROM supplier_products_raw
    WHERE supplier_id = p_supplier_id
      AND variant_id IS NOT NULL
      AND (raw_data->>'QuantidadeDisponivel') IS NOT NULL
  )
  UPDATE product_variants pv
  SET
    stock_quantity        = rv.qty,
    last_sync_at          = now(),
    last_sync_supplier_id = p_supplier_id
  FROM raw_vals rv
  WHERE pv.id = rv.variant_id
    AND pv.stock_quantity IS DISTINCT FROM rv.qty;
  GET DIAGNOSTICS v_variants_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success',          true,
    'vss_updated',      v_vss_updated,
    'variants_updated', v_variants_updated,
    'segundos',         round(extract(epoch FROM clock_timestamp() - v_t0)::numeric, 2),
    'ts',               now()
  );
END;
$function$
