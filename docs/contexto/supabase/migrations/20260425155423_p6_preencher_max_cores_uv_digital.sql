-- Backup
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'backup_p6_max_cores_null_25_04_2026',
  jsonb_build_object(
    'data_backup', NOW()::text,
    'motivo', 'P6 - Preencher max_cores NULL → 10 em UV_DIGITAL (full color)',
    'tecnicas_afetadas', (
      SELECT jsonb_agg(jsonb_build_object('codigo', codigo_tabela, 'nome', nome) ORDER BY codigo_tabela)
      FROM tabela_preco_gravacao_oficial
      WHERE max_cores IS NULL
    )
  ),
  'Backup P6 antes de preencher max_cores NULL'
);

UPDATE tabela_preco_gravacao_oficial
SET max_cores = 10, updated_at = NOW()
WHERE max_cores IS NULL;
