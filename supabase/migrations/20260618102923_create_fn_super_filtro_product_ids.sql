-- Super Filtro: resolver server-side de IDs para filtros de metadados
-- (Datas Comemorativas, Tags, Ramos/Segmentos de Atividade, Público-Alvo).
-- Retorna product_ids ATIVOS que satisfazem TODOS os grupos de filtro ativos
-- (AND entre grupos), com OR dentro de cada grupo. cardinality()=0 => grupo
-- inativo (sem restrição). Espelha o padrão de useProductsByColor/Category:
-- o frontend intersecta o Set client-side com a grade já carregada.
CREATE OR REPLACE FUNCTION public.fn_super_filtro_product_ids(
  _datas text[] DEFAULT '{}',
  _tags text[] DEFAULT '{}',
  _ramos text[] DEFAULT '{}',
  _segmentos text[] DEFAULT '{}',
  _publico text[] DEFAULT '{}'
) RETURNS TABLE(product_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
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
        WHERE pt.product_id = b.id AND pt.tag_id = ANY(_tags::uuid[]) ) )
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
$func$;

COMMENT ON FUNCTION public.fn_super_filtro_product_ids(text[],text[],text[],text[],text[])
  IS 'Super Filtro: product_ids ativos por metadados (datas/tags/ramos/segmentos/publico). AND entre grupos, OR dentro. Consumido por useProductsByMetadata.';

GRANT EXECUTE ON FUNCTION public.fn_super_filtro_product_ids(text[],text[],text[],text[],text[])
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';;
