-- Marcar tabelas inativas com categoria de destino baseado em análise:
-- ARCHIVE: técnicas que provavelmente não serão usadas, manter histórico
-- LEGACY: técnicas que tiveram modelo refeito (clones modernos existem)
-- REVIVABLE: técnicas com potencial comercial, decidir caso a caso

UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  COALESCE(opcoes_modificadores, '{}'::jsonb),
  '{status_classificacao}',
  to_jsonb(
    CASE 
      -- LEGACY: existem versões modernas ativas que substituem
      WHEN codigo_tabela IN ('SERITEX-01', 'SERITEX-AR-01', 'DTF-TEX-01', 'DTF-UV-01', 'SUBL-TEX-01') 
        THEN 'LEGACY'
      -- REVIVABLE: técnica útil que pode voltar (sublimação camiseta/caneca, bordado patch)
      WHEN codigo_tabela IN ('SUBL-CAM-A3-01', 'SUBL-CAM-A4-01', 'SUBL-CAN1-01', 'SUBL-CAN2-01', 'SUBL-CAN360-01',
                             'BORD-PATCH-01', 'BORD-PATCHHD-01', 'DECAL-PORC-01', 'DECAL-VIDR-01')
        THEN 'REVIVABLE'
      -- ARCHIVE: técnicas que ficaram fora do portfolio
      ELSE 'ARCHIVE'
    END::text
  ),
  true
)
WHERE ativo = false;

-- Adicionar histórico
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores,
  '{historico_fixes}',
  COALESCE(opcoes_modificadores->'historico_fixes', '[]'::jsonb) ||
  jsonb_build_array(jsonb_build_object(
    'data', '2026-04-25',
    'fix_id', 'EXP-02',
    'descricao', 'Tabela inativa categorizada: LEGACY (substituida), REVIVABLE (potencial comercial), ARCHIVE (sem demanda).',
    'descoberto_em', 'Auditoria 2026-04-25'
  ))
)
WHERE ativo = false;
