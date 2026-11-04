-- Migrar faturamento_minimo_base → faturamento_minimo_custo (chave canônica)
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = 
  -- 1) adicionar faturamento_minimo_custo com o valor de _base
  jsonb_set(
    -- 2) remover faturamento_minimo_base
    opcoes_modificadores - 'faturamento_minimo_base',
    '{faturamento_minimo_custo}',
    opcoes_modificadores->'faturamento_minimo_base',
    true
  ),
  updated_at = NOW()
WHERE ativo = true
  AND opcoes_modificadores->>'faturamento_minimo_base' IS NOT NULL
  AND opcoes_modificadores->>'faturamento_minimo_custo' IS NULL;

-- Append histórico
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores, '{historico_fixes}',
  COALESCE(opcoes_modificadores->'historico_fixes', '[]'::jsonb) ||
  jsonb_build_array(jsonb_build_object(
    'data', '2026-04-25',
    'fix_id', 'FIX-07',
    'descricao', 'Migrado faturamento_minimo_base -> faturamento_minimo_custo (chave canonica unificada).',
    'descoberto_em', 'Re-analise: 2 chaves coexistindo com mesma semantica'
  ))
)
WHERE codigo_tabela IN (
  'BORD-MOC-01','PLAQ-MOC-01','SERITEX-CAM-A3-01','SERITEX-CAM-A4-01',
  'SERITEX-MOC-1C-01','SERITEX-SAC-A3-01','SERITEX-SAC-A4-01',
  'SERITEX-SAE-A3-01','SERITEX-SAE-A4-01'
);
