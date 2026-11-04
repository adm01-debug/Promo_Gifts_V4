-- Documentar oficialmente o motivo da divergência A3 vs A4 (família SERITEX)
-- Para evitar que alguém "padronize" essa diferença por engano

UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores,
  '{politica_setup_familia}',
  jsonb_build_object(
    'racional', 'A3 cobra setup R$50/cor pelo fotolito A3 (insumo caro). A4 nao cobra setup pois cliche A4 e reaproveitavel/menor custo.',
    'A3_setup_por_cor', true,
    'A3_custo_setup', 50.00,
    'A4_setup_por_cor', false,
    'A4_custo_setup', 0.00,
    'NAO_PADRONIZAR_ENTRE_FORMATOS', 'Diferenca intencional baseada em insumo real. Manter divergencia.'
  ),
  true
)
WHERE codigo_tabela IN (
  'SERITEX-CAM-A3-01','SERITEX-CAM-A4-01',
  'SERITEX-SAC-A3-01','SERITEX-SAC-A4-01',
  'SERITEX-SAE-A3-01','SERITEX-SAE-A4-01'
);

-- Mesma coisa para SUBL-CAM (A3 vs A4 com mesmo padrao)
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores,
  '{politica_setup_familia}',
  jsonb_build_object(
    'racional', 'A3 e A4 da familia SUBL-CAM compartilham mesmo modelo (setup zero, custo no preco_unitario com fatmin como piso).',
    'A3_setup_por_cor', false, 'A3_custo_setup', 0.00,
    'A4_setup_por_cor', false, 'A4_custo_setup', 0.00,
    'A3_fatmin_R$', 120.00, 'A4_fatmin_R$', 80.00
  ),
  true
)
WHERE codigo_tabela IN ('SUBL-CAM-A3-01','SUBL-CAM-A4-01','SUBL-SAC-A3-01','SUBL-SAC-A4-01','SUBL-SAE-A3-01','SUBL-SAE-A4-01');

-- Append historico em todas
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores, '{historico_fixes}',
  COALESCE(opcoes_modificadores->'historico_fixes', '[]'::jsonb) ||
  jsonb_build_array(jsonb_build_object(
    'data', '2026-04-25',
    'fix_id', 'FIX-11',
    'descricao', 'Documentada politica_setup_familia explicando divergencias intencionais A3 vs A4 (fotolito caro em A3, reaproveitavel em A4).',
    'descoberto_em', 'Re-analise pos-correcoes 2026-04-25'
  ))
)
WHERE codigo_tabela IN (
  'SERITEX-CAM-A3-01','SERITEX-CAM-A4-01',
  'SERITEX-SAC-A3-01','SERITEX-SAC-A4-01',
  'SERITEX-SAE-A3-01','SERITEX-SAE-A4-01',
  'SUBL-CAM-A3-01','SUBL-CAM-A4-01',
  'SUBL-SAC-A3-01','SUBL-SAC-A4-01',
  'SUBL-SAE-A3-01','SUBL-SAE-A4-01'
);
