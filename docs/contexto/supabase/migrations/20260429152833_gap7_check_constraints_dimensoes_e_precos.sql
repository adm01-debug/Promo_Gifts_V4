-- GAP #7: CHECK constraints pra blindar consistência de dados
-- 1) Faixas: qty positiva, dimensões positivas, preço positivo, ranges coerentes
ALTER TABLE tabela_preco_gravacao_oficial_faixa
  ADD CONSTRAINT chk_faixa_qty_positiva 
    CHECK (quantidade_minima > 0 AND (quantidade_maxima IS NULL OR quantidade_maxima >= quantidade_minima));

ALTER TABLE tabela_preco_gravacao_oficial_faixa
  ADD CONSTRAINT chk_faixa_preco_positivo
    CHECK (preco_unitario > 0);

ALTER TABLE tabela_preco_gravacao_oficial_faixa
  ADD CONSTRAINT chk_faixa_largura_coerente
    CHECK (largura_min IS NULL OR largura_max IS NULL 
           OR (largura_min > 0 AND largura_max >= largura_min));

ALTER TABLE tabela_preco_gravacao_oficial_faixa
  ADD CONSTRAINT chk_faixa_altura_coerente
    CHECK (altura_min IS NULL OR altura_max IS NULL 
           OR (altura_min > 0 AND altura_max >= altura_min));

-- 2) Kit print_areas: dimensões positivas
ALTER TABLE kit_component_print_areas
  ADD CONSTRAINT chk_kit_print_area_dim_positiva
    CHECK (max_width > 0 AND max_height > 0);

-- 3) Tabela_preco: setup, markup, piso não-negativos
ALTER TABLE tabela_preco_gravacao_oficial
  ADD CONSTRAINT chk_tabela_preco_valores_validos
    CHECK (
      custo_setup >= 0 
      AND COALESCE(custo_aplicacao, 0) >= 0 
      AND COALESCE(markup_percent, 0) >= 0
      AND COALESCE(preco_minimo_unitario, 0) >= 0
      AND COALESCE(max_cores, 1) > 0
    );
