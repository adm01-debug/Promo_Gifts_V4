CREATE OR REPLACE FUNCTION public.fn_get_product_intelligence_all()
 RETURNS TABLE(product_id uuid, turnover_score numeric, avg_depletion_7d numeric, avg_depletion_30d numeric, abc_classification text, total_depleted_30d numeric, total_depleted_90d numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- FIX GAP-2 (2026-06-18 audit): filtra produtos inativos/deletados.
  -- analytics.mv_product_intelligence incluía 72 registros de produtos desativados
  -- (originados de analytics.mv_stock_velocity que não filtra por is_active).
  -- Adicionar JOIN com products garante que a API sempre retorna apenas produtos ativos.
  SELECT
    mi.product_id,
    mi.turnover_score,
    mi.avg_depletion_7d,
    mi.avg_depletion_30d,
    mi.abc_classification,
    mi.total_depleted_30d,
    mi.total_depleted_90d
  FROM mv_product_intelligence mi          -- public view → analytics.mv_product_intelligence
  JOIN products p ON p.id = mi.product_id  -- filter: apenas ativos e não deletados
  WHERE p.is_active = true
    AND (p.is_deleted IS NOT TRUE OR p.is_deleted IS NULL);
$function$
