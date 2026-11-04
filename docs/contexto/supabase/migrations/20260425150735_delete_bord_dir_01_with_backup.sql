-- ============================================================
-- EXCLUSÃO DE BORD-DIR-01 (informação incorreta)
-- Backup em system_settings + DELETE em cascata via FK
-- ============================================================

-- 1) Backup completo (header + faixas) ANTES de deletar
INSERT INTO system_settings (setting_key, setting_value, description)
SELECT 
  'backup_bord_dir_01_excluida_25_04_2026',
  jsonb_build_object(
    'motivo_exclusao', 'Informação incorreta — confirmado por Pink em 25/04/2026',
    'data_exclusao', NOW()::text,
    'header', to_jsonb(t.*),
    'faixas', (
      SELECT jsonb_agg(to_jsonb(f.*) ORDER BY f.ordem)
      FROM tabela_preco_gravacao_oficial_faixa f
      WHERE f.tabela_preco_gravacao_id = t.id
    )
  ),
  'Backup pré-exclusão da técnica BORD-DIR-01 (Bordado | Direto na Peça). Tabela considerada informação errada e removida. Rollback possível via reinserção a partir deste JSONB.'
FROM tabela_preco_gravacao_oficial t
WHERE t.codigo_tabela = 'BORD-DIR-01'
ON CONFLICT (setting_key) DO UPDATE 
  SET setting_value = EXCLUDED.setting_value,
      description = EXCLUDED.description,
      updated_at = NOW();

-- 2) DELETE da técnica (faixas vão via CASCADE)
DELETE FROM tabela_preco_gravacao_oficial 
WHERE codigo_tabela = 'BORD-DIR-01';
