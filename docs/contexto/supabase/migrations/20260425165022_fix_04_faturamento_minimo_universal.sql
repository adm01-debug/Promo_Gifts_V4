-- Política: para tabelas sem fatmin explícito, usar custo_setup como referência
-- (mantém comportamento atual + torna explícito)
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores,
  '{faturamento_minimo_custo}',
  to_jsonb(custo_setup),
  true
),
updated_at = NOW()
WHERE ativo = true
  AND opcoes_modificadores->>'faturamento_minimo_base' IS NULL
  AND opcoes_modificadores->>'faturamento_minimo_custo' IS NULL
  AND custo_setup > 0;

-- Para BORD-MOC-01 que tem setup=0 mas tem fatmin no JSONB (faturamento_minimo_base=100), nada a fazer.
-- Append historico
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores,
  '{historico_fixes}',
  COALESCE(opcoes_modificadores->'historico_fixes', '[]'::jsonb) ||
  jsonb_build_array(jsonb_build_object(
    'data', '2026-04-25',
    'fix_id', 'FIX-04',
    'descricao', 'faturamento_minimo_custo igualado a custo_setup (política conservadora). Torna explícito o piso já praticado.',
    'descoberto_em', 'Auditoria 2026-04-25'
  ))
)
WHERE opcoes_modificadores->>'faturamento_minimo_custo' IS NOT NULL
  AND ativo = true
  AND custo_setup > 0
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(opcoes_modificadores->'historico_fixes', '[]'::jsonb)) e
    WHERE e->>'fix_id' = 'FIX-04'
  );
