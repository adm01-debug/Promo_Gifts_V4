-- Marcar no JSONB as tabelas com inconsistência conhecida (setup fixo + cobra por cor)
-- para revisão comercial futura. NÃO altera setup_por_cor para preservar comportamento atual.
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores,
  '{historico_fixes}',
  COALESCE(opcoes_modificadores->'historico_fixes', '[]'::jsonb) ||
  jsonb_build_array(jsonb_build_object(
    'data', '2026-04-25',
    'fix_id', 'PAD-03-PENDING',
    'descricao', 'INCONSISTENCIA CONHECIDA: tabela cobra por cor mas setup_por_cor=false. Pendente validacao comercial - se confirmado que tela/cliche por cor multiplica setup, mudar para true.',
    'descoberto_em', 'Auditoria 2026-04-25',
    'tipo', 'PENDENCIA_DECISAO_COMERCIAL'
  ))
)
WHERE codigo_tabela IN (
  'SERITEX-SAC-A4-01', 'SERIUV-CIL-01', 'SERIUV-CIL-03',
  'TAMPO-MT-01', 'TAMPO-PL-01'
);
