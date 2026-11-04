-- Adiciona multiplicador_cor nas 7 tabelas que cobram por cor mas só usavam os campos legados
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores,
  '{multiplicador_cor}',
  '{"1": 1.00, "2": 1.80, "3": 2.55}'::jsonb,
  true
),
updated_at = NOW()
WHERE codigo_tabela IN (
  'TAMPO-CN-01', 'TAMPO-CN-02', 'TAMPO-MCN-01',
  'TAMPO-MT-01', 'TAMPO-PL-01',
  'SERIUV-CIL-01', 'SERIUV-CIL-03'
);

-- Append no historico_fixes
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores,
  '{historico_fixes}',
  COALESCE(opcoes_modificadores->'historico_fixes', '[]'::jsonb) ||
  jsonb_build_array(jsonb_build_object(
    'data', '2026-04-25',
    'fix_id', 'FIX-03',
    'descricao', 'Adicionado multiplicador_cor {1:1.0, 2:1.8, 3:2.55} - derivado matematicamente dos campos desconto_segunda_cor (10%) e desconto_terceira_cor (15%). Preserva preço cobrado.',
    'descoberto_em', 'Auditoria 2026-04-25 - inconsistência de fontes de verdade'
  ))
)
WHERE codigo_tabela IN (
  'TAMPO-CN-01', 'TAMPO-CN-02', 'TAMPO-MCN-01',
  'TAMPO-MT-01', 'TAMPO-PL-01',
  'SERIUV-CIL-01', 'SERIUV-CIL-03'
);

-- TAMPO-CN-02 também recebe os campos legados de desconto (estavam NULL e ele cobrava por cor sem fonte)
UPDATE tabela_preco_gravacao_oficial
SET desconto_segunda_cor = 10.00,
    desconto_terceira_cor = 15.00
WHERE codigo_tabela = 'TAMPO-CN-02'
  AND desconto_segunda_cor IS NULL;
