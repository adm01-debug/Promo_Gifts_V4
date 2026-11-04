-- Cadastrar versao_modelo em todas tabelas ativas que ainda não têm
-- Padrão: v{N}_{slug_grupo} indicando estágio de modelagem
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores, '{versao_modelo}',
  to_jsonb(
    'v2_' || lower(grupo_tecnica) || '_pos_correcoes_2026_04'
  ), true)
WHERE ativo = true
  AND opcoes_modificadores->>'versao_modelo' IS NULL;

-- Append historico
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores, '{historico_fixes}',
  COALESCE(opcoes_modificadores->'historico_fixes', '[]'::jsonb) ||
  jsonb_build_array(jsonb_build_object(
    'data', '2026-04-25',
    'fix_id', 'FIX-08',
    'descricao', 'Cadastrado versao_modelo (rastreabilidade do estagio do modelo de calculo).',
    'descoberto_em', 'Re-analise pos-correcoes 2026-04-25'
  ))
)
WHERE ativo = true
  AND opcoes_modificadores->>'versao_modelo' = 'v2_' || lower(grupo_tecnica) || '_pos_correcoes_2026_04';
