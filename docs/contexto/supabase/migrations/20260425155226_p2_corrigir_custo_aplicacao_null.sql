-- Backup
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'backup_p2_custo_aplicacao_null_25_04_2026',
  jsonb_build_object(
    'data_backup', NOW()::text,
    'motivo', 'P2 - Preencher custo_aplicacao NULL → 0 em 12 técnicas',
    'tecnicas_afetadas', (
      SELECT jsonb_agg(jsonb_build_object('codigo', codigo_tabela, 'nome', nome) ORDER BY codigo_tabela)
      FROM tabela_preco_gravacao_oficial
      WHERE custo_aplicacao IS NULL
    )
  ),
  'Backup P2 antes de preencher custo_aplicacao NULL'
);

-- Atualizar
UPDATE tabela_preco_gravacao_oficial
SET custo_aplicacao = 0, updated_at = NOW()
WHERE custo_aplicacao IS NULL;
