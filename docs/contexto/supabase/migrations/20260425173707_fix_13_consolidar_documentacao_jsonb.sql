-- Consolidar chaves de documentação humana em sub-objeto 'documentacao' 
-- (formula_*, exemplo_*) - limpa raiz do JSONB sem perder informação

UPDATE tabela_preco_gravacao_oficial t
SET opcoes_modificadores = (
  -- 1. Remover chaves antigas
  (opcoes_modificadores 
    - 'formula_custo_total_exato'
    - 'formula_custo_total_pedido'  
    - 'formula_custo_unitario_exato'
    - 'formula_custo_unitario_peca'
    - 'formula_venda'
    - 'formula_venda_total'
    - 'formula_custo_total'
    - 'formula_custo_por_peca'
    - 'exemplo_10x10_100pc'
    - 'exemplo_A3_29x42_1000pc'
    - 'exemplo_A4_18x28_100pc'
    - 'exemplo_calculo_100pc_10x10'
  )
  -- 2. Adicionar como sub-objeto consolidado se houvesse alguma dessas chaves
  || jsonb_build_object('documentacao', 
       jsonb_strip_nulls(jsonb_build_object(
         'formula_custo_total', opcoes_modificadores->'formula_custo_total_exato',
         'formula_custo_unitario', opcoes_modificadores->'formula_custo_unitario_exato',
         'formula_venda', opcoes_modificadores->'formula_venda',
         'formula_custo_por_peca', opcoes_modificadores->'formula_custo_por_peca',
         'exemplos_calculo', jsonb_strip_nulls(jsonb_build_object(
           '10x10_100pc', opcoes_modificadores->'exemplo_10x10_100pc',
           'A3_29x42_1000pc', opcoes_modificadores->'exemplo_A3_29x42_1000pc',
           'A4_18x28_100pc', opcoes_modificadores->'exemplo_A4_18x28_100pc'
         ))
       ))
     )
)
WHERE ativo = true
  AND (
    opcoes_modificadores ? 'formula_custo_total_exato'
    OR opcoes_modificadores ? 'formula_venda'
    OR opcoes_modificadores ? 'exemplo_10x10_100pc'
    OR opcoes_modificadores ? 'exemplo_A3_29x42_1000pc'
    OR opcoes_modificadores ? 'exemplo_A4_18x28_100pc'
    OR opcoes_modificadores ? 'formula_custo_unitario_exato'
    OR opcoes_modificadores ? 'formula_custo_total_pedido'
    OR opcoes_modificadores ? 'formula_custo_unitario_peca'
    OR opcoes_modificadores ? 'formula_venda_total'
    OR opcoes_modificadores ? 'formula_custo_total'
    OR opcoes_modificadores ? 'formula_custo_por_peca'
    OR opcoes_modificadores ? 'exemplo_calculo_100pc_10x10'
  );

-- Append historico
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores, '{historico_fixes}',
  COALESCE(opcoes_modificadores->'historico_fixes', '[]'::jsonb) ||
  jsonb_build_array(jsonb_build_object(
    'data', '2026-04-25',
    'fix_id', 'FIX-13',
    'descricao', 'Chaves formula_* e exemplo_* consolidadas em documentacao{} - limpeza da raiz do JSONB.',
    'descoberto_em', 'Re-analise: 67+ chaves espalhadas no JSONB'
  ))
)
WHERE ativo = true AND opcoes_modificadores ? 'documentacao';
