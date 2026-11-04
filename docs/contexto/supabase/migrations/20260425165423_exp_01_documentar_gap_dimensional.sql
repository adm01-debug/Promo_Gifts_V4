-- EXP-01: Marcar gap dimensional para extensão futura
-- Não criar preços sem validação comercial — documentar pendência
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores,
  '{historico_fixes}',
  COALESCE(opcoes_modificadores->'historque_fixes', '[]'::jsonb) ||
  jsonb_build_array(jsonb_build_object(
    'data', '2026-04-25',
    'fix_id', 'EXP-01-PENDING',
    'descricao', 'GAP DIMENSIONAL: faixa atual cobre apenas larguras pequenas. Estado atual nao causa descobertura porque produtos cadastrados estao dentro do limite. Pendente: expandir cobertura quando primeiro produto novo exceder.',
    'descoberto_em', 'Auditoria 2026-04-25',
    'tipo', 'PENDENCIA_EXPANSAO_DIMENSIONAL',
    'estado_atual', jsonb_build_object('largura_max_cm', 3.0, 'altura_max_cm', 12.0),
    'sugestao', 'expandir para 20cm largura quando demandado'
  ))
)
WHERE codigo_tabela IN ('UVDIG-PL-01', 'UVDIG-PL-02', 'FIBER-PL-01');
