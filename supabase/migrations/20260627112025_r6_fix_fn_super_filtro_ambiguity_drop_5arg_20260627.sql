-- ═══════════════════════════════════════════════════════════════════
-- R6 · Desambiguar fn_super_filtro_product_ids — drop overload 5-arg
-- fix_version: super_filtro_dedup_20260627
--
-- Problema: dois overloads com todos os parâmetros DEFAULT='{}'
--   5-arg: (_datas, _tags, _ramos, _segmentos, _publico)
--   6-arg: (_datas, _tags, _ramos, _segmentos, _publico, _endomarketing)
-- Ao chamar sem argumentos, PostgreSQL lança 42725 (operador ambíguo).
--
-- Solução: DROP do overload 5-arg (subconjunto lógico do 6-arg).
-- O overload 6-arg com _endomarketing='{}'::text[] é funcionalmente
-- idêntico ao 5-arg para todos os callers existentes.
--
-- Retrocompatibilidade:
--   - Chamadas com 0 args: resolvem para 6-arg ✅
--   - Chamadas com 1-5 args posicionais: 6-arg aceita (params restantes = '{}') ✅
--   - Chamadas com params nomeados sem _endomarketing: 6-arg resolve ✅
--   - Nenhuma VIEW referencia este overload especificamente ✅
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.fn_super_filtro_product_ids(
  text[], text[], text[], text[], text[]
);

-- Recriar o overload 6-arg com comentário fix_version (anti-Lovable-bot)
CREATE OR REPLACE FUNCTION public.fn_super_filtro_product_ids(
  _datas         text[] DEFAULT '{}'::text[],
  _tags          text[] DEFAULT '{}'::text[],
  _ramos         text[] DEFAULT '{}'::text[],
  _segmentos     text[] DEFAULT '{}'::text[],
  _publico       text[] DEFAULT '{}'::text[],
  _endomarketing text[] DEFAULT '{}'::text[]
)
RETURNS TABLE(product_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
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
$fn$;

COMMENT ON FUNCTION public.fn_super_filtro_product_ids(text[],text[],text[],text[],text[],text[]) IS
'[fix_version:super_filtro_dedup_20260627] Super-filtro de produtos por múltiplas dimensões.
 Overload 5-arg (sem _endomarketing) foi REMOVIDO em 20260627 para eliminar ambiguidade 42725.
 Este é o ÚNICO overload. Chamar com 0 a 6 args — todos têm DEFAULT.
 Parâmetros: _datas (slug de datas comemorativas), _tags (UUIDs), _ramos (slug ramo),
 _segmentos (slug segmento), _publico (texto ex: feminino), _endomarketing (slug tag).';

REVOKE EXECUTE ON FUNCTION public.fn_super_filtro_product_ids(text[],text[],text[],text[],text[],text[]) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_super_filtro_product_ids(text[],text[],text[],text[],text[],text[]) TO anon, authenticated, service_role;;
