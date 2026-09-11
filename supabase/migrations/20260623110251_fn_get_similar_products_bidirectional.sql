
-- MELHORIA 2: Função bidirecional de produtos similares
-- Corrige o gap onde 266 produtos só aparecem em related_product_id
-- e jamais seriam encontrados pela query atual do app (WHERE product_id = X)

-- Garantir que existe coluna is_active em product_relationships
-- (para não retornar relacionamentos desativados por deactivation cascades)

CREATE OR REPLACE FUNCTION public.fn_get_similar_products(
  p_product_id uuid,
  p_limit      integer DEFAULT 50,
  p_offset     integer DEFAULT 0
)
RETURNS TABLE(
  similar_product_id uuid,
  direction          text  -- 'outgoing' | 'incoming' (diagnóstico; pode ser ignorado pelo caller)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Direção outgoing: este produto é o "origin" (product_id = p_product_id)
  -- Usa o índice UNIQUE (product_id, related_product_id, relationship_type) → Bitmap Index Scan eficiente
  (
    SELECT pr.related_product_id AS similar_product_id,
           'outgoing'            AS direction
    FROM   public.product_relationships pr
    WHERE  pr.product_id        = p_product_id
      AND  pr.relationship_type = 'similar'
      AND  pr.is_active         = true
    ORDER  BY pr.related_product_id
  )
  UNION ALL
  -- Direção incoming: este produto está no lado "destination" (related_product_id = p_product_id)
  -- Usa o índice idx_product_relationships_related_product_id → Index Scan eficiente
  (
    SELECT pr.product_id   AS similar_product_id,
           'incoming'      AS direction
    FROM   public.product_relationships pr
    WHERE  pr.related_product_id = p_product_id
      AND  pr.relationship_type  = 'similar'
      AND  pr.is_active          = true
    ORDER  BY pr.product_id
  )
  LIMIT  p_limit
  OFFSET p_offset
$$;

-- Grant de acesso para o PostgREST (anon + authenticated)
GRANT EXECUTE ON FUNCTION public.fn_get_similar_products(uuid, integer, integer) TO anon, authenticated;

COMMENT ON FUNCTION public.fn_get_similar_products IS
  'Retorna produtos similares consultando AMBAS as direções de product_relationships
   (product_id = X  e  related_product_id = X), corrigindo o gap causado pelo
   armazenamento canônico unidirecional imposto por idx_product_relationships_canonical_pair.
   Substitui a query direta na tabela pelo hook useSimilarProducts.ts via RPC.';
;
