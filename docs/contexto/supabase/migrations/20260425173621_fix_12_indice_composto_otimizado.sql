-- Índice especializado para o padrão de acesso da v11:
-- JOIN em (tab_id, qty BETWEEN min..max) + filtros dimensionais opcionais

-- Para faixas com dimensional (BTREE composto cobrindo qty + dim)
CREATE INDEX IF NOT EXISTS idx_faixa_v11_dim
  ON tabela_preco_gravacao_oficial_faixa
  (tabela_preco_gravacao_id, quantidade_minima, quantidade_maxima,
   largura_min, largura_max, altura_min, altura_max);

-- Para queries de "pico anterior" (faixa com qty_max < qty_atual)
CREATE INDEX IF NOT EXISTS idx_faixa_v11_qty_max
  ON tabela_preco_gravacao_oficial_faixa (tabela_preco_gravacao_id, quantidade_maxima)
  WHERE quantidade_maxima IS NOT NULL;

-- Recalcular estatísticas
ANALYZE tabela_preco_gravacao_oficial_faixa;
ANALYZE tabela_preco_gravacao_oficial;
ANALYZE print_area_techniques;
