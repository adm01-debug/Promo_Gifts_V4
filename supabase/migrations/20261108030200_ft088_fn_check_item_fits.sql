-- Rollback: supabase/rollbacks/20261108030200_rollback.sql
-- FT-088: Versionar function fn_check_item_fits
-- Objeto JÁ EXISTE em produção (confirmado via pg_get_functiondef 2026-11-08).
-- Aplicação idempotente via CREATE OR REPLACE — risco zero, sem mudança de estrutura.
-- Front: versioning-only. Integração RPC no Kit Builder será item FT-088-FRONT.

CREATE OR REPLACE FUNCTION public.fn_check_item_fits(
  p_packaging_id uuid,
  p_product_id uuid,
  p_current_used_liters numeric DEFAULT 0
)
 RETURNS TABLE(
   fits boolean,
   packaging_volume numeric,
   product_volume numeric,
   used_volume numeric,
   available_volume numeric,
   percentage_used numeric
 )
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_pkg NUMERIC; v_prod NUMERIC; v_avail NUMERIC; v_has_dims BOOLEAN;
BEGIN
  SELECT ((COALESCE(p.internal_length_cm,0)*COALESCE(p.internal_width_cm,0)*COALESCE(p.internal_height_cm,0))/1000)::NUMERIC
  INTO v_pkg FROM products p WHERE p.id=p_packaging_id AND p.product_type='packaging';
  SELECT (CASE
      WHEN p.length_cm IS NOT NULL AND p.width_cm IS NOT NULL AND p.height_cm IS NOT NULL THEN (p.length_cm*p.width_cm*p.height_cm)/1000
      WHEN p.diameter_cm IS NOT NULL AND p.height_cm IS NOT NULL THEN (PI()*POWER(p.diameter_cm/2,2)*p.height_cm)/1000
      WHEN p.is_kit THEN (SELECT SUM(COALESCE(pkc.quantity,1)*CASE
            WHEN pkc.shape_type='cylindrical' AND pkc.diameter_mm IS NOT NULL AND pkc.height_mm IS NOT NULL THEN PI()*POWER(pkc.diameter_mm/20.0,2)*(pkc.height_mm/10.0)
            WHEN pkc.length_mm IS NOT NULL AND pkc.width_mm IS NOT NULL AND pkc.height_mm IS NOT NULL THEN (pkc.length_mm/10.0)*(pkc.width_mm/10.0)*(pkc.height_mm/10.0)
            WHEN pkc.shape_type='flat' AND pkc.length_mm IS NOT NULL AND pkc.width_mm IS NOT NULL THEN (pkc.length_mm/10.0)*(pkc.width_mm/10.0)*0.8
            ELSE 0 END)/1000 FROM product_kit_components pkc WHERE pkc.kit_product_id=p.id AND pkc.is_packaging=FALSE)
      ELSE NULL END)::NUMERIC,
    (p.length_cm IS NOT NULL OR p.diameter_cm IS NOT NULL OR p.is_kit)
  INTO v_prod, v_has_dims FROM products p WHERE p.id=p_product_id;
  v_avail := v_pkg - p_current_used_liters;
  RETURN QUERY SELECT
    CASE WHEN v_prod IS NULL OR NOT COALESCE(v_has_dims,FALSE) THEN NULL ELSE (v_prod <= v_avail) END,
    ROUND(v_pkg,2),
    ROUND(v_prod,4),
    p_current_used_liters,
    ROUND(v_avail,2),
    ROUND((p_current_used_liters/NULLIF(v_pkg,0))*100,1);
END;
$function$
;
