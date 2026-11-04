-- Backup completo das 38 técnicas órfãs
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'backup_p4_tecnicas_orfas_desativadas_25_04_2026',
  jsonb_build_object(
    'data_backup', NOW()::text,
    'motivo', 'P4 - Desativar técnicas sem nenhum PAT vinculado (dead code)',
    'criterio_reativacao', 'Reativar (ativo=true) quando for vincular a produtos via PAT',
    'tecnicas_desativadas', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'codigo_tabela', t.codigo_tabela,
        'nome', t.nome,
        'grupo_tecnica', t.grupo_tecnica
      ) ORDER BY t.grupo_tecnica, t.codigo_tabela)
      FROM tabela_preco_gravacao_oficial t
      WHERE NOT EXISTS (
        SELECT 1 FROM print_area_techniques pat 
        WHERE pat.tabela_preco_id = t.id
      )
    )
  ),
  'Backup P4 - 38 técnicas órfãs desativadas. Para reativar: UPDATE ativo=true por codigo_tabela.'
);

-- DESATIVAR técnicas sem PAT
UPDATE tabela_preco_gravacao_oficial t
SET ativo = false, updated_at = NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM print_area_techniques pat WHERE pat.tabela_preco_id = t.id
);
