INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'backup_p3_seriuv_cil_360_25_04_2026',
  jsonb_build_object(
    'data_backup', NOW()::text,
    'motivo', 'P3 - SERIUV-CIL-02/04 (360° UV) cobra_por_cor T→F, max_cores 1→10',
    'estado_anterior', (
      SELECT jsonb_agg(to_jsonb(t.*) ORDER BY t.codigo_tabela)
      FROM tabela_preco_gravacao_oficial t
      WHERE t.codigo_tabela IN ('SERIUV-CIL-02','SERIUV-CIL-04')
    )
  ),
  'Backup P3 antes de alinhar SERIUV-CIL-02/04 com padrão UV 360°'
);

UPDATE tabela_preco_gravacao_oficial
SET cobra_por_cor = false,
    max_cores = 10,
    updated_at = NOW()
WHERE codigo_tabela IN ('SERIUV-CIL-02','SERIUV-CIL-04');
