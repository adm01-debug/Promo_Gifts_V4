-- Documentar a inserção no histórico das tabelas SUBL-CAM
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores, '{historico_fixes}',
  COALESCE(opcoes_modificadores->'historico_fixes', '[]'::jsonb) ||
  jsonb_build_array(jsonb_build_object(
    'data', '2026-04-25',
    'fix_id', 'FIX-10',
    'descricao', 'Cadastrados em print_area_techniques nos 16 produtos camiseta paridade com DTF/SERITEX. ATENCAO: assumiu que todas as camisetas DTF aceitam sublimacao (poliester/microfibra/dryfit). Revisar caso surjam camisetas algodao puro - SUBL nao funciona em algodao.',
    'descoberto_em', 'Re-analise pos-correcoes: tabela ativa mas inalcancavel'
  ))
)
WHERE codigo_tabela IN ('SUBL-CAM-A3-01','SUBL-CAM-A4-01');
