-- SERITEX-SAC-A4-01: setup=0 → setup_por_cor=false é trivialmente correto. Resolver.
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores, '{historico_fixes}',
  COALESCE(opcoes_modificadores->'historico_fixes', '[]'::jsonb) ||
  jsonb_build_array(jsonb_build_object(
    'data', '2026-04-25',
    'fix_id', 'FIX-15a',
    'descricao', 'PAD-03-PENDING resolvido: setup=0, entao setup_por_cor=false e trivialmente correto (0xN=0). Modelo cobra por cor via preco_unitario+multiplicador apenas. SEM mudanca.',
    'tipo', 'RESOLUCAO_DEFINITIVA'
  ))
)
WHERE codigo_tabela = 'SERITEX-SAC-A4-01';

-- SERIUV-CIL-01, SERIUV-CIL-03, TAMPO-MT-01, TAMPO-PL-01:
-- setup>0 + cobra por cor + setup_por_cor=false. Tecnicamente cada cor deveria multiplicar setup
-- (1 cliche/tela por cor). Mas MUDAR vai alterar preço cobrado.
-- Estratégia: registrar recomendacao no JSONB, NAO mexer no flag (preserva preço atual).

UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores,
  '{recomendacao_tecnica}',
  jsonb_build_object(
    'campo', 'custo_setup_por_cor',
    'valor_atual', false,
    'valor_recomendado', true,
    'justificativa', 'Cada cor exige um cliche/tela proprio. Setup multiplicado por cor reflete o custo real de pre-impressao.',
    'impacto_se_aplicar', 'Cotacoes 2-3 cores aumentam: setup x N_cores. Decisao comercial pendente sobre absorver no markup ou repassar.',
    'flag_atual_preserva_compatibilidade', true
  ),
  true
)
WHERE codigo_tabela IN ('SERIUV-CIL-01','SERIUV-CIL-03','TAMPO-MT-01','TAMPO-PL-01');

UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores, '{historico_fixes}',
  COALESCE(opcoes_modificadores->'historico_fixes', '[]'::jsonb) ||
  jsonb_build_array(jsonb_build_object(
    'data', '2026-04-25',
    'fix_id', 'FIX-15b',
    'descricao', 'PAD-03-PENDING formalizado: campo recomendacao_tecnica adicionado no JSONB com sugestao de mudar setup_por_cor para true. Flag NAO alterado para nao mudar preco cobrado. Decisao comercial fica registrada e visivel.',
    'tipo', 'RECOMENDACAO_REGISTRADA'
  ))
)
WHERE codigo_tabela IN ('SERIUV-CIL-01','SERIUV-CIL-03','TAMPO-MT-01','TAMPO-PL-01');
