
DROP VIEW IF EXISTS public.v_audit_paradoxos_gravacao CASCADE;

CREATE VIEW public.v_audit_paradoxos_gravacao AS
WITH
p1 AS (
  SELECT 'P1'::text AS codigo_paradoxo,
    'Técnica ativa sem faixas de preço'::text AS descricao,
    t.codigo_tabela, t.nome, t.grupo_tecnica,
    NULL::text AS produto_sku, NULL::text AS location_code,
    NULL::text AS detalhe, 'ALTO'::text AS severidade
  FROM tabela_preco_gravacao_oficial t
  WHERE t.ativo = true
    AND NOT EXISTS (
      SELECT 1 FROM tabela_preco_gravacao_oficial_faixa f
      WHERE f.tabela_preco_gravacao_id = t.id
    )
),
p2 AS (
  SELECT 'P2'::text, 'Produto ativo sem técnica configurada'::text,
    NULL::text, NULL::text, NULL::text,
    p.sku::text, NULL::text, p.name::text, 'MEDIO'::text
  FROM products p
  WHERE p.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM print_area_techniques pat
      WHERE pat.product_id = p.id AND pat.is_active = true
    )
),
p3 AS (
  SELECT 'P3'::text, 'PAT ativa de produto inativo'::text,
    t.codigo_tabela, t.nome, t.grupo_tecnica,
    p.sku::text, pat.location_code,
    ('product_id='||pat.product_id::text), 'ALTO'::text
  FROM print_area_techniques pat
  JOIN products p ON p.id = pat.product_id
  JOIN tabela_preco_gravacao_oficial t ON t.id = pat.tabela_preco_id
  WHERE pat.is_active = true AND p.is_active = false
),
p4 AS (
  SELECT 'P4'::text, 'PAT aponta para técnica inativa'::text,
    t.codigo_tabela, t.nome, t.grupo_tecnica,
    p.sku::text, pat.location_code,
    ('tabela_preco_id='||pat.tabela_preco_id::text), 'ALTO'::text
  FROM print_area_techniques pat
  JOIN tabela_preco_gravacao_oficial t ON t.id = pat.tabela_preco_id
  JOIN products p ON p.id = pat.product_id
  WHERE pat.is_active = true AND t.ativo = false
),
p5 AS (
  SELECT 'P5'::text, 'Técnica com faixa única (sem escala)'::text,
    t.codigo_tabela, t.nome, t.grupo_tecnica,
    NULL::text, NULL::text, ('faixas='||COUNT(f.id)::text), 'BAIXO'::text
  FROM tabela_preco_gravacao_oficial t
  JOIN tabela_preco_gravacao_oficial_faixa f ON f.tabela_preco_gravacao_id = t.id
  WHERE t.ativo = true
  GROUP BY t.id, t.codigo_tabela, t.nome, t.grupo_tecnica
  HAVING COUNT(f.id) = 1
),
p6 AS (
  SELECT 'P6'::text, 'cobra_por_cor=true com max_cores<=1'::text,
    t.codigo_tabela, t.nome, t.grupo_tecnica,
    NULL::text, NULL::text,
    ('max_cores='||COALESCE(t.max_cores::text,'NULL')), 'MEDIO'::text
  FROM tabela_preco_gravacao_oficial t
  WHERE t.ativo = true
    AND t.cobra_por_cor = true
    AND COALESCE(t.max_cores, 1) <= 1
)
SELECT * FROM p1
UNION ALL SELECT * FROM p2
UNION ALL SELECT * FROM p3
UNION ALL SELECT * FROM p4
UNION ALL SELECT * FROM p5
UNION ALL SELECT * FROM p6;

GRANT SELECT ON public.v_audit_paradoxos_gravacao TO authenticated, anon;
;
