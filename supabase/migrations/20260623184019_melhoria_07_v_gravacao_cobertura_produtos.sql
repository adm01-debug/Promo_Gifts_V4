
-- ================================================================
-- MELHORIA-07: View de cobertura — quantos produtos por técnica/grupo
-- Permite identificar gaps de configuração em massa
-- ================================================================
CREATE OR REPLACE VIEW public.v_gravacao_cobertura AS
SELECT
  t.grupo_tecnica,
  t.codigo_tabela,
  t.nome AS tecnica_nome,
  t.ativo AS tecnica_ativa,
  COUNT(DISTINCT pat.product_id) AS produtos_configurados,
  COUNT(DISTINCT pat.id)         AS total_areas_configuradas,
  MIN(pat.max_width)             AS min_largura_cm,
  MAX(pat.max_width)             AS max_largura_cm,
  ROUND(AVG(COALESCE(pat.max_width,0)),2) AS avg_largura_cm,
  -- Proporção de produtos ativos com esta técnica
  ROUND(
    COUNT(DISTINCT pat.product_id)::numeric /
    NULLIF((SELECT COUNT(*) FROM products WHERE is_active=true), 0) * 100,
    2
  ) AS pct_produtos_ativos
FROM tabela_preco_gravacao_oficial t
LEFT JOIN print_area_techniques pat
  ON pat.tabela_preco_id = t.id AND pat.is_active = true
GROUP BY t.id, t.grupo_tecnica, t.codigo_tabela, t.nome, t.ativo
ORDER BY produtos_configurados DESC, t.grupo_tecnica, t.codigo_tabela;

GRANT SELECT ON public.v_gravacao_cobertura TO authenticated;

-- Amostra dos top 10
SELECT grupo_tecnica, codigo_tabela, tecnica_nome, produtos_configurados, pct_produtos_ativos
FROM public.v_gravacao_cobertura
WHERE tecnica_ativa = true
ORDER BY produtos_configurados DESC
LIMIT 10;
;
