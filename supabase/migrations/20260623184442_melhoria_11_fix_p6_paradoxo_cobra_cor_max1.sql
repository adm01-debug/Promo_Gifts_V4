
-- ================================================================
-- MELHORIA-11: Corrigir P6 — cobra_por_cor=true com max_cores=1
-- ADE1-01 "Adesivo | 1 Cor" e ETQ1-01 "Etiqueta | 1 Cor"
-- São técnicas de 1 cor por definição — cobra_por_cor deve ser false.
-- Cobrar "por cor" quando só existe 1 cor é paradoxo lógico que
-- pode gerar erro silencioso no multiplicador de cor da cotação.
-- ================================================================
UPDATE public.tabela_preco_gravacao_oficial
SET
  cobra_por_cor = false,
  updated_at = now()
WHERE codigo_tabela IN ('ADE1-01', 'ETQ1-01')
  AND cobra_por_cor = true
  AND COALESCE(max_cores, 1) <= 1;

-- Confirmar correção
SELECT codigo_tabela, nome, cobra_por_cor, max_cores
FROM tabela_preco_gravacao_oficial
WHERE codigo_tabela IN ('ADE1-01', 'ETQ1-01');
;
