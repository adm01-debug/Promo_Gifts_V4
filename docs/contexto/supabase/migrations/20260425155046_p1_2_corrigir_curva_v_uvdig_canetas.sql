-- Backup
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'backup_p1_2_uvdig_canetas_25_04_2026',
  jsonb_build_object(
    'data_backup', NOW()::text,
    'motivo', 'P1.2 - Reordenar curva V em UVDIG-CN-01/CN-02/MCN-01',
    'estado_anterior', (
      SELECT jsonb_agg(jsonb_build_object(
        'codigo', t.codigo_tabela, 'ordem', f.ordem, 
        'qmin', f.quantidade_minima, 'qmax', f.quantidade_maxima, 
        'preco', f.preco_unitario
      ) ORDER BY t.codigo_tabela, f.ordem)
      FROM tabela_preco_gravacao_oficial t
      JOIN tabela_preco_gravacao_oficial_faixa f ON f.tabela_preco_gravacao_id = t.id
      WHERE t.codigo_tabela IN ('UVDIG-CN-01','UVDIG-CN-02','UVDIG-MCN-01')
    )
  ),
  'Backup P1.2 antes de corrigir curva V'
);

-- UVDIG-CN-01: 0,33→0,40→0,36 → 0,40→0,36→0,33
UPDATE tabela_preco_gravacao_oficial_faixa f
SET preco_unitario = CASE f.ordem
  WHEN 1 THEN 0.40
  WHEN 2 THEN 0.36
  WHEN 3 THEN 0.33
END, updated_at = NOW()
FROM tabela_preco_gravacao_oficial t
WHERE f.tabela_preco_gravacao_id = t.id 
  AND t.codigo_tabela = 'UVDIG-CN-01';

-- UVDIG-CN-02 e UVDIG-MCN-01: 0,43→0,52→0,47 → 0,52→0,47→0,43
UPDATE tabela_preco_gravacao_oficial_faixa f
SET preco_unitario = CASE f.ordem
  WHEN 1 THEN 0.52
  WHEN 2 THEN 0.47
  WHEN 3 THEN 0.43
END, updated_at = NOW()
FROM tabela_preco_gravacao_oficial t
WHERE f.tabela_preco_gravacao_id = t.id 
  AND t.codigo_tabela IN ('UVDIG-CN-02','UVDIG-MCN-01');
