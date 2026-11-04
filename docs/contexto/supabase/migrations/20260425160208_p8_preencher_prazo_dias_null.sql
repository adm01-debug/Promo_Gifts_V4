-- Backup
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'backup_p8_prazo_dias_null_25_04_2026',
  jsonb_build_object(
    'data_backup', NOW()::text,
    'motivo', 'P8 - Preencher prazo_dias NULL (46 faixas em 9 técnicas)',
    'estado_anterior', (
      SELECT jsonb_agg(jsonb_build_object(
        'codigo', t.codigo_tabela, 'faixa_id', f.id, 'ordem', f.ordem,
        'qmin', f.quantidade_minima, 'qmax', f.quantidade_maxima
      ) ORDER BY t.codigo_tabela, f.ordem)
      FROM tabela_preco_gravacao_oficial t
      JOIN tabela_preco_gravacao_oficial_faixa f ON f.tabela_preco_gravacao_id = t.id
      WHERE f.prazo_dias IS NULL
    )
  ),
  'Backup P8 antes de preencher prazo_dias NULL'
);

-- Aplicar regra geral: prazo cresce com qty
UPDATE tabela_preco_gravacao_oficial_faixa f
SET prazo_dias = CASE
  WHEN f.quantidade_maxima <= 99 THEN 2
  WHEN f.quantidade_maxima <= 499 THEN 3
  WHEN f.quantidade_maxima <= 1999 THEN 5
  ELSE 7
END,
updated_at = NOW()
FROM tabela_preco_gravacao_oficial t
WHERE f.tabela_preco_gravacao_id = t.id
  AND f.prazo_dias IS NULL
  AND t.codigo_tabela NOT IN ('BORD-MOC-01','DTF-TEX-MOC-01');

-- BORD-MOC-01: bordado é mais demorado
UPDATE tabela_preco_gravacao_oficial_faixa f
SET prazo_dias = CASE
  WHEN f.quantidade_maxima <= 100 THEN 5
  WHEN f.quantidade_maxima <= 200 THEN 5
  ELSE 7
END,
updated_at = NOW()
FROM tabela_preco_gravacao_oficial t
WHERE f.tabela_preco_gravacao_id = t.id 
  AND t.codigo_tabela = 'BORD-MOC-01'
  AND f.prazo_dias IS NULL;

-- DTF-TEX-MOC-01: padrão DTF = 5 dias
UPDATE tabela_preco_gravacao_oficial_faixa f
SET prazo_dias = 5, updated_at = NOW()
FROM tabela_preco_gravacao_oficial t
WHERE f.tabela_preco_gravacao_id = t.id 
  AND t.codigo_tabela = 'DTF-TEX-MOC-01'
  AND f.prazo_dias IS NULL;
