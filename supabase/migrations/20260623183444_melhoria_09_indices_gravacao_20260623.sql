
-- MELHORIA-09: Índices adicionais para as queries críticas de gravação

-- I1: idx_tpgo_ativo_grupo — usado na listagem do wizard admin
-- (ativo=true filtra + GROUP BY grupo_tecnica na UI)
CREATE INDEX IF NOT EXISTS idx_tpgo_ativo_grupo
  ON public.tabela_preco_gravacao_oficial (ativo, grupo_tecnica)
  WHERE ativo = true;

-- I2: idx_tpgof_tabela_qty — usado na busca da faixa de preço
-- fn_get_customization_price faz: WHERE tabela_preco_gravacao_id = X
-- AND quantidade_minima <= p_qty ORDER BY quantidade_minima
CREATE INDEX IF NOT EXISTS idx_tpgof_tabela_qty
  ON public.tabela_preco_gravacao_oficial_faixa
  (tabela_preco_gravacao_id, quantidade_minima, quantidade_maxima)
  INCLUDE (preco_unitario, prazo_dias, largura_min, largura_max, altura_min, altura_max);

-- I3: idx_pat_product_location — join interno de fn_get_product_customization_options
-- O índice composto (product_id, is_active) já existe (idx_pat_product_active)
-- Adicionar (location_code) para o join interno por location_code
CREATE INDEX IF NOT EXISTS idx_pat_product_location_active
  ON public.print_area_techniques (product_id, location_code, is_active)
  WHERE is_active = true;

-- Validar índices criados
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname='public'
  AND tablename IN ('tabela_preco_gravacao_oficial',
                    'tabela_preco_gravacao_oficial_faixa',
                    'print_area_techniques')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
;
