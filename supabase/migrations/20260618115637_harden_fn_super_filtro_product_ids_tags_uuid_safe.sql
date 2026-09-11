-- Endurecimento backward-compatible: tags nao-UUID sao ignoradas (igual a datas/ramos),
-- em vez de lancar 22P02. Comportamento identico em todo input valido (provado em 305 casos
-- diferenciais v1 vs v2). Demais clausulas inalteradas.
CREATE OR REPLACE FUNCTION public.fn_super_filtro_product_ids(
  _datas text[] DEFAULT '{}', _tags text[] DEFAULT '{}', _ramos text[] DEFAULT '{}',
  _segmentos text[] DEFAULT '{}', _publico text[] DEFAULT '{}')
RETURNS TABLE(product_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $fn$
  SELECT b.id
  FROM products b
  WHERE b.is_active = true AND b.is_deleted IS NOT TRUE
    AND ( cardinality(_datas)=0 OR EXISTS (
        SELECT 1 FROM product_commemorative_dates pcd
        JOIN commemorative_dates cd ON cd.id = pcd.commemorative_date_id AND cd.is_active
        WHERE pcd.product_id = b.id AND pcd.is_active AND cd.slug = ANY(_datas) ) )
    AND ( cardinality(_tags)=0 OR EXISTS (
        SELECT 1 FROM product_tags pt
        JOIN tags t ON t.id = pt.tag_id AND t.is_active
        WHERE pt.product_id = b.id AND pt.tag_id = ANY( ARRAY(
            SELECT x::uuid FROM unnest(_tags) AS x
            WHERE x ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        ) ) ) )
    AND ( cardinality(_ramos)=0 OR EXISTS (
        SELECT 1 FROM produto_ramo_atividade pra
        JOIN ramo_atividade_filho raf ON raf.id = pra.ramo_atividade_filho_id
        JOIN ramo_atividade ra ON ra.id = raf.ramo_atividade_id
        WHERE pra.produto_id = b.id AND ra.slug = ANY(_ramos) ) )
    AND ( cardinality(_segmentos)=0 OR EXISTS (
        SELECT 1 FROM produto_ramo_atividade pra
        JOIN ramo_atividade_filho raf ON raf.id = pra.ramo_atividade_filho_id
        WHERE pra.produto_id = b.id AND raf.slug = ANY(_segmentos) ) )
    AND ( cardinality(_publico)=0 OR b.target_audience && _publico );
$fn$;

DROP FUNCTION IF EXISTS public._sf_v2(text[],text[],text[],text[],text[]);

GRANT EXECUTE ON FUNCTION public.fn_super_filtro_product_ids(text[],text[],text[],text[],text[]) TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';;
