CREATE OR REPLACE FUNCTION public.fn_super_filtro_product_ids(_datas text[] DEFAULT '{}'::text[], _tags text[] DEFAULT '{}'::text[], _ramos text[] DEFAULT '{}'::text[], _segmentos text[] DEFAULT '{}'::text[], _publico text[] DEFAULT '{}'::text[], _endomarketing text[] DEFAULT '{}'::text[])
 RETURNS TABLE(product_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- fix_version: super_filtro_dedup_20260627
-- anti-regression: manter search_path=public + SECURITY DEFINER.
-- Histórico: overload 5-arg removido em 20260627 para eliminar 42725.
-- Este é o único overload — NÃO recriar versão sem _endomarketing.
  SELECT b.id
  FROM products b
  WHERE b.is_active = true AND b.is_deleted IS NOT TRUE
    AND ( cardinality(COALESCE(_datas,'{}'))=0 OR EXISTS (
        SELECT 1 FROM product_commemorative_dates pcd
        JOIN commemorative_dates cd ON cd.id = pcd.commemorative_date_id AND cd.is_active
        WHERE pcd.product_id = b.id AND pcd.is_active AND cd.slug = ANY(_datas) ) )
    AND ( cardinality(COALESCE(_tags,'{}'))=0 OR EXISTS (
        SELECT 1 FROM product_tags pt
        JOIN tags t ON t.id = pt.tag_id AND t.is_active
        WHERE pt.product_id = b.id AND pt.tag_id = ANY( ARRAY(
            SELECT x::uuid FROM unnest(_tags) AS x
            WHERE x ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        ) ) ) )
    AND ( cardinality(COALESCE(_ramos,'{}'))=0 OR EXISTS (
        SELECT 1 FROM produto_ramo_atividade pra
        JOIN ramo_atividade_filho raf ON raf.id = pra.ramo_atividade_filho_id
        JOIN ramo_atividade ra ON ra.id = raf.ramo_atividade_id
        WHERE pra.produto_id = b.id AND ra.slug = ANY(_ramos) ) )
    AND ( cardinality(COALESCE(_segmentos,'{}'))=0 OR EXISTS (
        SELECT 1 FROM produto_ramo_atividade pra
        JOIN ramo_atividade_filho raf ON raf.id = pra.ramo_atividade_filho_id
        WHERE pra.produto_id = b.id AND raf.slug = ANY(_segmentos) ) )
    AND ( cardinality(COALESCE(_publico,'{}'))=0 OR b.target_audience && _publico )
    AND ( cardinality(COALESCE(_endomarketing,'{}'))=0 OR EXISTS (
        SELECT 1 FROM product_tags pt
        JOIN tags t ON t.id = pt.tag_id AND t.is_active
        WHERE pt.product_id = b.id AND t.slug = ANY(_endomarketing) ) );
$function$
