
-- MELHORIA-02: View consolidada de saúde da arquitetura de gravação
-- Responde em 1 query: quantas técnicas ativas, cobertura de produtos,
-- faixas por técnica, média de locais por produto, paradoxos ativos.

CREATE OR REPLACE VIEW public.v_health_gravacao AS
WITH
tecnicas AS (
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE ativo) AS ativas,
    COUNT(*) FILTER (WHERE NOT ativo) AS inativas,
    COUNT(*) FILTER (WHERE ativo AND NOT EXISTS (
      SELECT 1 FROM tabela_preco_gravacao_oficial_faixa f
      WHERE f.tabela_preco_gravacao_id = t.id
    )) AS ativas_sem_faixa
  FROM tabela_preco_gravacao_oficial t
),
faixas AS (
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE f.preco_unitario = 0) AS preco_zero,
    ROUND(AVG(cnt_por_tecnica), 1) AS media_faixas_por_tecnica
  FROM tabela_preco_gravacao_oficial_faixa f
  JOIN (
    SELECT tabela_preco_gravacao_id, COUNT(*) AS cnt_por_tecnica
    FROM tabela_preco_gravacao_oficial_faixa
    GROUP BY tabela_preco_gravacao_id
  ) g ON g.tabela_preco_gravacao_id = f.tabela_preco_gravacao_id
),
pat AS (
  SELECT
    COUNT(*) AS total_rows,
    COUNT(*) FILTER (WHERE is_active) AS ativas,
    COUNT(DISTINCT product_id) AS produtos_com_tecnica,
    COUNT(DISTINCT product_id) FILTER (WHERE is_active) AS produtos_ativos_com_tecnica,
    ROUND(AVG(locais_por_produto), 1) AS media_locais_por_produto
  FROM print_area_techniques,
  LATERAL (
    SELECT COUNT(DISTINCT location_code) AS locais_por_produto
    FROM print_area_techniques p2
    WHERE p2.product_id = print_area_techniques.product_id
      AND p2.is_active = true
  ) loc
),
produtos AS (
  SELECT
    COUNT(*) FILTER (WHERE is_active AND NOT is_deleted) AS ativos,
    COUNT(*) FILTER (
      WHERE is_active AND NOT is_deleted
        AND NOT EXISTS (
          SELECT 1 FROM print_area_techniques pat
          WHERE pat.product_id = p.id AND pat.is_active = true
        )
    ) AS ativos_sem_tecnica
  FROM products p
),
paradoxos AS (
  SELECT
    COUNT(*) FILTER (WHERE status_natural = 'PARADOXO_NATURAL') AS paradoxos_naturais,
    COUNT(*) FILTER (WHERE status_natural = 'OK') AS transicoes_ok
  FROM v_audit_paradoxos_gravacao
)
SELECT
  -- Técnicas
  t.total AS tecnicas_total,
  t.ativas AS tecnicas_ativas,
  t.inativas AS tecnicas_inativas,
  t.ativas_sem_faixa AS tecnicas_ativas_sem_faixa,
  -- Faixas
  f.total AS faixas_total,
  f.preco_zero AS faixas_preco_zero,
  f.media_faixas_por_tecnica,
  -- Vínculos produto↔técnica
  pa.total_rows AS pat_total_rows,
  pa.ativas AS pat_ativas,
  pa.produtos_com_tecnica,
  pa.produtos_ativos_com_tecnica,
  pa.media_locais_por_produto,
  -- Produtos
  pr.ativos AS produtos_ativos,
  pr.ativos_sem_tecnica AS produtos_ativos_sem_tecnica,
  ROUND(100.0 * pa.produtos_ativos_com_tecnica::numeric / NULLIF(pr.ativos, 0), 1) AS cobertura_pct,
  -- Paradoxos de negócio
  p.paradoxos_naturais,
  p.transicoes_ok,
  -- Score de qualidade (0-100)
  ROUND(
    100.0
    - (t.ativas_sem_faixa * 5)
    - (LEAST(f.preco_zero * 10, 20))
    - (LEAST((100 - ROUND(100.0 * pa.produtos_ativos_com_tecnica::numeric / NULLIF(pr.ativos, 0), 1))::int, 30))
    , 0
  ) AS qualidade_score,
  NOW() AS verificado_em
FROM tecnicas t, faixas f, pat pa, produtos pr, paradoxos p;

GRANT SELECT ON public.v_health_gravacao TO authenticated;
COMMENT ON VIEW public.v_health_gravacao IS
  'Dashboard de saúde da arquitetura de gravação — 1 linha, snapshot ao vivo.';
;
