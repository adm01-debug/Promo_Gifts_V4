CREATE OR REPLACE FUNCTION public.rpc_sales_assistant_candidates(p_ramo_pai_id uuid, p_color_group_ids uuid[], p_price_min numeric, p_price_max numeric, p_limit integer DEFAULT 8, p_max_per_category integer DEFAULT 2, p_min_score integer DEFAULT 50)
 RETURNS TABLE(product_id uuid, name text, sale_price numeric, primary_image_url text, category_id uuid, score integer, sinal_ramo boolean, sinal_cor boolean, sinal_giro boolean, sinal_novidade boolean, sinal_gravacao boolean, sinal_preco boolean, sinal_estoque boolean, classe_giro text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
WITH
-- Produtos ligados ao ramo PAI do cliente. O vínculo em `produto_ramo_atividade` é sempre com
-- o FILHO, então o pai só se alcança passando por `ramo_atividade_filho`. Com
-- `p_ramo_pai_id IS NULL` a CTE volta vazia e o sinal de ramo fica falso para todo mundo —
-- não é preciso um `IS NOT NULL` extra.
ramo_hits AS MATERIALIZED (
  SELECT DISTINCT pra.produto_id AS id
  FROM public.produto_ramo_atividade pra
  JOIN public.ramo_atividade_filho raf ON raf.id = pra.ramo_atividade_filho_id
  WHERE raf.ramo_atividade_id = p_ramo_pai_id
),
-- Produtos com variante ATIVA em algum dos grupos de cor da logo do cliente. Idem: array
-- vazio ou nulo devolve zero linhas, e o sinal de cor fica falso sem precisar de guarda.
cor_hits AS MATERIALIZED (
  SELECT DISTINCT pv.product_id AS id
  FROM public.product_variants pv
  JOIN public.color_variations cv ON cv.id = pv.color_id
  WHERE pv.is_active
    AND COALESCE(cv.is_active, true)
    AND cv.color_group_id = ANY(p_color_group_ids)
),
pontuado AS MATERIALIZED (
  SELECT
    p.id                AS product_id,
    p.name              AS name,
    p.sale_price        AS sale_price,
    p.primary_image_url AS primary_image_url,
    p.category_id       AS category_id,
    (rh.id IS NOT NULL) AS sinal_ramo,
    (ch.id IS NOT NULL) AS sinal_cor,
    (mv.abc_classification = 'A') AS sinal_giro,
    -- Novidade só vale dentro da janela: `is_new` sem validade não envelhece sozinho.
    (COALESCE(p.is_new, false)
      AND COALESCE(p.is_new_expires_at, p.novelty_expires_at) > now()) AS sinal_novidade,
    COALESCE(p.allows_personalization, false) AS sinal_gravacao,
    -- Sem faixa informada o sinal de preço não é avaliado: some para todos por igual, em vez
    -- de afirmar "está na faixa que o cliente costuma comprar" sem faixa nenhuma na mão.
    (p.sale_price IS NOT NULL
      AND (p_price_min IS NOT NULL OR p_price_max IS NOT NULL)
      AND p.sale_price >= COALESCE(p_price_min, 0::numeric)
      AND p.sale_price <= COALESCE(p_price_max, 'Infinity'::numeric)) AS sinal_preco,
    (COALESCE(p.stock_quantity, 0) > 0) AS sinal_estoque,
    mv.abc_classification AS classe_giro,
    -- Critério de desempate, não de nota: entre dois produtos com a mesma pontuação, ganha o
    -- de maior giro. Fica fora do retorno porque o front não escreve nada com ele.
    COALESCE(mv.turnover_score, 0::numeric) AS giro_num,
    (CASE WHEN rh.id IS NOT NULL THEN 30 ELSE 0 END
   + CASE WHEN ch.id IS NOT NULL THEN 25 ELSE 0 END
   + CASE WHEN mv.abc_classification = 'A' THEN 15 ELSE 0 END
   + CASE WHEN COALESCE(p.is_new, false)
               AND COALESCE(p.is_new_expires_at, p.novelty_expires_at) > now()
          THEN 12 ELSE 0 END
   + CASE WHEN COALESCE(p.allows_personalization, false) THEN 10 ELSE 0 END
   + CASE WHEN p.sale_price IS NOT NULL
               AND (p_price_min IS NOT NULL OR p_price_max IS NOT NULL)
               AND p.sale_price >= COALESCE(p_price_min, 0::numeric)
               AND p.sale_price <= COALESCE(p_price_max, 'Infinity'::numeric)
          THEN 10 ELSE 0 END
   + CASE WHEN COALESCE(p.stock_quantity, 0) > 0 THEN 8 ELSE 0 END)::int AS score
  FROM public.products p
  LEFT JOIN ramo_hits rh ON rh.id = p.id
  LEFT JOIN cor_hits  ch ON ch.id = p.id
  LEFT JOIN public.mv_product_intelligence mv ON mv.product_id = p.id
  -- Os dois ÚNICOS filtros duros.
  WHERE p.is_active
    AND NOT COALESCE(p.is_deleted, false)
),
-- Diversificação: sem ela a lista volta com 8 canetas. A posição é por categoria, com o mesmo
-- critério de ordenação da lista final, para o representante de cada categoria ser o melhor
-- dela e não um empate resolvido ao acaso.
elegivel AS (
  SELECT
    pt.*,
    row_number() OVER (
      PARTITION BY pt.category_id
      ORDER BY pt.score DESC, pt.giro_num DESC, pt.product_id
    ) AS pos_na_categoria
  FROM pontuado pt
  WHERE pt.score >= p_min_score
)
SELECT
  e.product_id,
  e.name,
  e.sale_price,
  e.primary_image_url,
  e.category_id,
  e.score,
  e.sinal_ramo,
  e.sinal_cor,
  e.sinal_giro,
  e.sinal_novidade,
  e.sinal_gravacao,
  e.sinal_preco,
  e.sinal_estoque,
  e.classe_giro
FROM elegivel e
WHERE e.pos_na_categoria <= p_max_per_category
ORDER BY e.score DESC, e.giro_num DESC, e.product_id
LIMIT p_limit;
$function$
