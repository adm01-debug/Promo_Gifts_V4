
-- Enriquecimento do reconciliador diário: NÍVEL 0 — coerência interna da VSS
-- (stock_main_warehouse + stock_other_warehouses == quantity canônico).
-- Auto-cura nightly de qualquer F-violation (ex.: main derivado com quantity
-- estável, que o trigger-espelho não cobre por só disparar em mudança de qty).
-- Snapshots suprimidos (correção != movimento real).
CREATE OR REPLACE FUNCTION public.fn_reconcile_stock_gold(p_dry_run boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_var int := 0; v_prod int := 0; v_vss int := 0;
  v_var_div int; v_prod_div int; v_vss_div int;
  v_t0 timestamptz := clock_timestamp();
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtext('fn_reconcile_stock_gold')::bigint) THEN
    RETURN jsonb_build_object('skipped','lock_ocupado');
  END IF;

  PERFORM set_config('app.bulk_import_mode','true', true);
  PERFORM set_config('app.write_source','reconcile', true);
  PERFORM set_config('app.skip_stock_snapshot','true', true);  -- correções não geram movimento

  -- diagnóstico (antes)
  SELECT count(*) INTO v_vss_div FROM variant_supplier_sources v
    WHERE v.is_active AND NOT COALESCE(v.removed_from_api,false)
      AND v.quantity IS DISTINCT FROM (COALESCE(v.stock_main_warehouse,0)+COALESCE(v.stock_other_warehouses,0));
  SELECT count(*) INTO v_var_div FROM (
    SELECT v.id FROM product_variants v
    LEFT JOIN variant_supplier_sources s ON s.variant_id=v.id AND s.is_active
    WHERE v.is_active
    GROUP BY v.id, v.stock_quantity
    HAVING COALESCE(v.stock_quantity,0) IS DISTINCT FROM COALESCE(sum(s.quantity),0)) z;
  SELECT count(*) INTO v_prod_div FROM (
    SELECT p.id FROM products p
    LEFT JOIN product_variants v ON v.product_id=p.id AND v.is_active
    WHERE p.is_active
    GROUP BY p.id, p.stock_quantity
    HAVING COALESCE(p.stock_quantity,0) IS DISTINCT FROM COALESCE(sum(v.stock_quantity),0)) z;

  IF p_dry_run THEN
    RETURN jsonb_build_object('dry_run', true,
      'vss_incoerentes', v_vss_div,
      'variantes_divergentes', v_var_div, 'products_divergentes', v_prod_div);
  END IF;

  -- nível 0: coerência interna VSS (main+other == quantity)
  WITH upd AS (
    UPDATE variant_supplier_sources v
       SET stock_main_warehouse = v.quantity,
           stock_other_warehouses = 0,
           updated_at = now()
    WHERE v.is_active AND NOT COALESCE(v.removed_from_api,false)
      AND v.quantity IS DISTINCT FROM (COALESCE(v.stock_main_warehouse,0)+COALESCE(v.stock_other_warehouses,0))
    RETURNING v.id)
  SELECT count(*) INTO v_vss FROM upd;

  -- nível 1: VSS → product_variants
  WITH agg AS (
    SELECT v.id, COALESCE(sum(s.quantity) FILTER (WHERE s.is_active),0) AS q
    FROM product_variants v
    LEFT JOIN variant_supplier_sources s ON s.variant_id=v.id
    WHERE v.is_active
    GROUP BY v.id),
  upd AS (
    UPDATE product_variants v SET stock_quantity = agg.q
    FROM agg WHERE v.id=agg.id AND COALESCE(v.stock_quantity,0) IS DISTINCT FROM agg.q
    RETURNING v.id)
  SELECT count(*) INTO v_var FROM upd;

  -- nível 2: product_variants → products (cache + is_stockout)
  WITH agg AS (
    SELECT p.id, COALESCE(sum(v.stock_quantity) FILTER (WHERE v.is_active),0) AS q
    FROM products p
    LEFT JOIN product_variants v ON v.product_id=p.id
    WHERE p.is_active
    GROUP BY p.id),
  upd AS (
    UPDATE products p
       SET stock_quantity = agg.q,
           is_stockout = (agg.q <= 0),
           last_stock_update_at = now()
    FROM agg WHERE p.id=agg.id
      AND (COALESCE(p.stock_quantity,0) IS DISTINCT FROM agg.q
           OR p.is_stockout IS DISTINCT FROM (agg.q <= 0))
    RETURNING p.id)
  SELECT count(*) INTO v_prod FROM upd;

  RETURN jsonb_build_object(
    'vss_incoerentes_antes', v_vss_div,
    'variantes_divergentes_antes', v_var_div,
    'products_divergentes_antes', v_prod_div,
    'vss_coerencia_corrigidas', v_vss,
    'variantes_corrigidas', v_var,
    'products_corrigidos', v_prod,
    'segundos', round(extract(epoch FROM clock_timestamp()-v_t0)::numeric,1),
    'ts', now());
END $function$;
;
