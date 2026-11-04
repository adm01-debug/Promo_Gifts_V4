-- Backup
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'backup_p1_3_clamp_dimensional_25_04_2026',
  jsonb_build_object(
    'data_backup', NOW()::text,
    'motivo', 'P1.3 - Clamp cascade de paradoxos em FIBER-PL-01, UVDIG-PL-01, UVDIG-PL-02',
    'estado_anterior', (
      SELECT jsonb_agg(jsonb_build_object(
        'codigo', t.codigo_tabela, 'faixa_id', f.id, 'ordem', f.ordem,
        'qmin', f.quantidade_minima, 'qmax', f.quantidade_maxima,
        'larg', f.largura_max, 'alt', f.altura_max,
        'preco', f.preco_unitario
      ) ORDER BY t.codigo_tabela, f.ordem)
      FROM tabela_preco_gravacao_oficial t
      JOIN tabela_preco_gravacao_oficial_faixa f ON f.tabela_preco_gravacao_id = t.id
      WHERE t.codigo_tabela IN ('FIBER-PL-01','UVDIG-PL-01','UVDIG-PL-02')
    )
  ),
  'Backup P1.3 antes de aplicar clamp cascade dimensional'
);

-- CLAMP CASCADE: para cada (técnica, dimensão), cada faixa fica ≤ anterior
WITH precos_clampeados AS (
  SELECT 
    f.id AS faixa_id,
    MIN(f.preco_unitario) OVER (
      PARTITION BY t.id, f.largura_max, f.altura_max
      ORDER BY f.quantidade_minima
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS preco_novo
  FROM tabela_preco_gravacao_oficial t
  JOIN tabela_preco_gravacao_oficial_faixa f ON f.tabela_preco_gravacao_id = t.id
  WHERE t.codigo_tabela IN ('FIBER-PL-01','UVDIG-PL-01','UVDIG-PL-02')
)
UPDATE tabela_preco_gravacao_oficial_faixa f
SET preco_unitario = pc.preco_novo, updated_at = NOW()
FROM precos_clampeados pc
WHERE f.id = pc.faixa_id AND f.preco_unitario <> pc.preco_novo;
