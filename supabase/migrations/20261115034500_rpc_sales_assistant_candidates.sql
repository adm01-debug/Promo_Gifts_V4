-- Rollback: supabase/rollbacks/20261115034500_rollback.sql
--
-- "Encaixe do Cliente", fase 1 — a função que escolhe e pontua os brindes de um cliente.
--
-- O QUE ELA RESOLVE
-- A ficha do cliente (/clientes/:id) mostra hoje um card "Produtos mais comprados" que está
-- sempre vazio: `orders` tem 5 linhas e nenhuma com `client_id`. Não há histórico de compra
-- para recomendar. Esta função troca o vazio por produtos escolhidos pelos sinais que o
-- catálogo REALMENTE tem (ramo de atividade, cor, giro, novidade, gravação, preço, estoque),
-- com a nota e os booleanos de cada sinal para o front escrever o motivo sem recalcular nada.
-- Nenhuma chamada de IA: quem escolhe é o banco.
--
-- POR QUE SÓ DOIS FILTROS DUROS (`is_active` e `NOT is_deleted`)
-- Com os 7 sinais aplicados como filtro "E", o funil morre. Medido no canônico
-- doufsxqlfjyuvxuezpln em 2026-11-15, no caso real "ramo Saúde + cor Azul + faixa 15–60":
--   7.926 produtos ativos · 943 têm o ramo Saúde · 2.426 têm variante ativa em azul ·
--   3.149 estão na faixa de preço · 274 são novidade válida · 4.985 aceitam gravação.
-- A interseção desses conjuntos é um punhado de itens. Por isso TODO o resto é PESO:
-- os mesmos dados, somados em vez de multiplicados, deixam 1.521 produtos acima do corte 50,
-- espalhados por 110 categorias — material suficiente para montar 8 cartões honestos.
--
-- A TABELA DE PESOS (máximo teórico 110)
--   ramo 30 · cor 25 · giro (classe A) 15 · novidade 12 · gravação 10 · faixa de preço 10 ·
--   estoque 8.
-- Os 18 pontos que o plano deixou em aberto ("faixa de preço e estoque o restante até 110")
-- foram divididos 10 + 8: preço é a objeção que o vendedor ouve primeiro, estoque é a que
-- ele ouve depois. MOQ ficou FORA da nota — entrar com ele estouraria os 110 declarados, e
-- inventar um peso não declarado seria pior que não ter o sinal.
--
-- GRAVAÇÃO É PESO, NUNCA FILTRO
-- `products.allows_personalization` está com a ingestão quebrada: dos 274 produtos marcados
-- como novidade, ZERO têm a marca de gravação; 25 deles têm `engraving_type`/
-- `engraving_description` preenchidos mesmo com a marca ausente. Ou seja, `false` não
-- distingue "não aceita gravação" de "ninguém importou o campo". Como filtro, esse campo
-- sumiria com produtos bons; como peso de 10, ele só deixa de somar, e o front mostra o aviso
-- "preciso confirmar a gravação".
--
-- GIRO = CLASSE A, E A CLASSE VAI JUNTO NO RETORNO
-- A classe de giro não existe em `products`; mora em `analytics.mv_product_intelligence`
-- (matview com 7.867 linhas, todas com `abc_classification`), exposta em
-- `public.mv_product_intelligence` com `security_invoker=true`. Os 15 pontos vão só para a
-- classe A — "mais vendido" é A, não B nem C. A coluna `classe_giro` volta no resultado com o
-- valor como ele está no banco, inclusive 'C': esconder a classe fraca de quem já ganhou
-- pontos por outro sinal seria enfeitar o dado.
--
-- SECURITY INVOKER, DE PROPÓSITO
-- A função roda com os privilégios de quem chama e com `search_path` vazio (todo objeto é
-- qualificado). Nenhuma tabela lida precisa de elevação: medido com `has_table_privilege` em
-- 2026-11-15, `authenticated` tem SELECT em products, product_variants, color_variations,
-- produto_ramo_atividade, ramo_atividade_filho e na matview de analytics (e USAGE no schema
-- analytics). `suppliers` NÃO é legível por `authenticated` e por isso não é lida aqui — o
-- sinal de giro sai da matview, não do fornecedor. SECURITY DEFINER está descartado: o
-- diagnóstico desta sessão achou 4 funções DEFINER sem validação de chamador que permitiam
-- alterar estoque de qualquer produto. Esta não é a quinta.
--
-- DESEMPENHO
-- `EXPLAIN (ANALYZE, BUFFERS)` do mesmo corpo, com os valores do caso real acima, no canônico:
-- Execution Time 73,735 ms (Planning 6,016 ms), 6.156 buffers, tudo em cache. Sem índice novo.
-- As CTEs são `MATERIALIZED` de propósito: na primeira versão, sem isso, o planner duplicou os
-- dois EXISTS (um para o filtro do corte, outro para a projeção) e o tempo foi a 265,872 ms.

CREATE OR REPLACE FUNCTION public.rpc_sales_assistant_candidates(
  p_ramo_pai_id      uuid,
  p_color_group_ids  uuid[],
  p_price_min        numeric,
  p_price_max        numeric,
  p_limit            int DEFAULT 8,
  p_max_per_category int DEFAULT 2,
  p_min_score        int DEFAULT 50
)
RETURNS TABLE (
  product_id        uuid,
  name              text,
  sale_price        numeric,
  primary_image_url text,
  category_id       uuid,
  score             int,
  sinal_ramo        boolean,
  sinal_cor         boolean,
  sinal_giro        boolean,
  sinal_novidade    boolean,
  sinal_gravacao    boolean,
  sinal_preco       boolean,
  sinal_estoque     boolean,
  classe_giro       text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $fn$
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
$fn$;

COMMENT ON FUNCTION public.rpc_sales_assistant_candidates(uuid, uuid[], numeric, numeric, int, int, int) IS
  'Encaixe do Cliente (fase 1): pontua o catálogo ativo para um cliente e devolve os melhores '
  'candidatos com a nota e um booleano por sinal. Filtros duros: apenas is_active e NOT '
  'is_deleted. Pesos: ramo 30, cor 25, giro classe A 15, novidade 12, gravação 10, faixa de '
  'preço 10, estoque 8 (máximo 110). SECURITY INVOKER: lê só o que o vendedor já pode ler.';

-- Execução explícita só para quem tem sessão. `anon` não tem SELECT em `public.products` nem
-- em `analytics`, então uma chamada anônima falharia de qualquer forma — melhor negar na porta.
REVOKE ALL ON FUNCTION public.rpc_sales_assistant_candidates(uuid, uuid[], numeric, numeric, int, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_sales_assistant_candidates(uuid, uuid[], numeric, numeric, int, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_sales_assistant_candidates(uuid, uuid[], numeric, numeric, int, int, int) TO service_role;
