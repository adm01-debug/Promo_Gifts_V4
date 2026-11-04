-- Fechar EXP-01-PENDING como decisão definitiva: manter cobertura atual
-- A v11 já retorna ERRO_LARGURA_EXCEDE_AREA explicitamente quando dimensão estoura
-- Criar preços sem custo real seria pior que ter o erro explicito

UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores, '{historico_fixes}',
  COALESCE(opcoes_modificadores->'historico_fixes', '[]'::jsonb) ||
  jsonb_build_array(jsonb_build_object(
    'data', '2026-04-25',
    'fix_id', 'FIX-14',
    'descricao', 'EXP-01-PENDING fechado: cobertura atual mantida. Decisao: criar precos para >3cm largura sem custo operacional real seria pior que retornar ERRO_LARGURA_EXCEDE_AREA explicitamente (que a v11 ja faz). Quando demanda real surgir, custos serao revisados antes de cadastrar faixas.',
    'tipo', 'DECISAO_DEFINITIVA'
  ))
)
WHERE codigo_tabela IN ('UVDIG-PL-01','UVDIG-PL-02','FIBER-PL-01');

-- Adicionar campo expansao_dimensional com política
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores,
  '{expansao_dimensional}',
  jsonb_build_object(
    'status', 'COBERTURA_INTENCIONAL',
    'largura_max_atual_cm', 3.0,
    'comportamento_quando_excede', 'fn_simular_combo_gravacao_v11 retorna ERRO_LARGURA_EXCEDE_AREA',
    'gatilho_para_expandir', 'Quando primeiro produto real demandar largura > 3cm, abrir RFC para revisar custo operacional.'
  ),
  true
)
WHERE codigo_tabela IN ('UVDIG-PL-01','UVDIG-PL-02','FIBER-PL-01');
