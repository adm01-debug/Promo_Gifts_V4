CREATE OR REPLACE VIEW v_audit_paradoxos_gravacao AS
WITH faixas_ord AS (
  SELECT 
    t.codigo_tabela, t.nome, t.grupo_tecnica,
    t.custo_setup, t.markup_percent,
    f.quantidade_minima, f.quantidade_maxima, f.preco_unitario,
    LAG(f.preco_unitario) OVER (
      PARTITION BY t.id, COALESCE(f.largura_min,0), 
                   COALESCE(f.largura_max,0), 
                   COALESCE(f.altura_min,0), 
                   COALESCE(f.altura_max,0)
      ORDER BY f.quantidade_minima
    ) AS preco_anterior,
    LAG(f.quantidade_maxima) OVER (
      PARTITION BY t.id, COALESCE(f.largura_min,0),
                   COALESCE(f.largura_max,0),
                   COALESCE(f.altura_min,0),
                   COALESCE(f.altura_max,0)
      ORDER BY f.quantidade_minima
    ) AS qty_max_anterior
  FROM tabela_preco_gravacao_oficial t
  JOIN tabela_preco_gravacao_oficial_faixa f 
    ON f.tabela_preco_gravacao_id = t.id
  WHERE t.ativo = true
)
SELECT 
  codigo_tabela, nome, grupo_tecnica,
  qty_max_anterior AS qty_pico_ant,
  preco_anterior,
  ROUND(((custo_setup + qty_max_anterior * preco_anterior) 
         * (1 + markup_percent/100))::numeric, 2) AS venda_no_pico,
  quantidade_minima AS qty_inicio,
  preco_unitario AS preco_atual,
  ROUND(((custo_setup + quantidade_minima * preco_unitario)
         * (1 + markup_percent/100))::numeric, 2) AS venda_inicio,
  ROUND(((custo_setup + quantidade_minima * preco_unitario)
         - (custo_setup + qty_max_anterior * preco_anterior))::numeric, 2)
    AS economia_cliente_se_subir_faixa,
  CASE 
    WHEN preco_anterior IS NULL THEN 'primeira_faixa'
    WHEN qty_max_anterior IS NULL THEN 'sem_pico_anterior'
    WHEN (custo_setup + quantidade_minima * preco_unitario)
       < (custo_setup + qty_max_anterior * preco_anterior) THEN 'PARADOXO_NATURAL'
    ELSE 'OK'
  END AS status_natural
FROM faixas_ord
WHERE preco_anterior IS NOT NULL
  AND qty_max_anterior IS NOT NULL
ORDER BY codigo_tabela, quantidade_minima;

COMMENT ON VIEW v_audit_paradoxos_gravacao IS
'Monitoramento contínuo: detecta paradoxos NATURAIS de preço entre faixas. Status PARADOXO_NATURAL é normal e esperado quando a regra MAX_ENTRE_FAIXAS está ativa - a regra protege na hora da cotação. Use junto com regra_anti_paradoxo no JSONB para confirmar mitigação.';
