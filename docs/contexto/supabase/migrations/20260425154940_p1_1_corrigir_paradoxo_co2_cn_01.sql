-- Backup do estado atual antes da correção
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'backup_p1_1_co2_cn_01_25_04_2026',
  jsonb_build_object(
    'data_backup', NOW()::text,
    'motivo', 'P1.1 - Correção paradoxo CO2-CN-01 faixa 1 R$0,00 → R$1,00',
    'estado_anterior', (
      SELECT jsonb_agg(to_jsonb(f.*) ORDER BY f.ordem)
      FROM tabela_preco_gravacao_oficial t
      JOIN tabela_preco_gravacao_oficial_faixa f ON f.tabela_preco_gravacao_id = t.id
      WHERE t.codigo_tabela = 'CO2-CN-01'
    )
  ),
  'Backup P1.1 antes de corrigir paradoxo CO2-CN-01'
);

-- Correção: faixa 1 (1-100) de R$0,00 para R$1,00 (igual faixa 2 — elimina paradoxo, monotonia decrescente)
UPDATE tabela_preco_gravacao_oficial_faixa
SET preco_unitario = 1.00, updated_at = NOW()
WHERE tabela_preco_gravacao_id = (
  SELECT id FROM tabela_preco_gravacao_oficial WHERE codigo_tabela = 'CO2-CN-01'
)
AND ordem = 1;
