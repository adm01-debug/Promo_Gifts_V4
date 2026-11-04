INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'backup_p7_flag_dimensional_25_04_2026',
  jsonb_build_object(
    'data_backup', NOW()::text,
    'motivo', 'P7 - Coerência: flag usa_faixa_dimensional=true onde faixas têm dim',
    'tecnicas_afetadas', jsonb_build_array('BORD-MOC-01', 'DTF-TEX-MOC-01')
  ),
  'Backup P7 antes de ajustar flag usa_faixa_dimensional'
);

UPDATE tabela_preco_gravacao_oficial
SET usa_faixa_dimensional = true, updated_at = NOW()
WHERE codigo_tabela IN ('BORD-MOC-01','DTF-TEX-MOC-01');
