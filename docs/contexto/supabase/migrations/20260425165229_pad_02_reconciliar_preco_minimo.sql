-- Reconcilia preco_minimo_unitario com o mínimo real das faixas
UPDATE tabela_preco_gravacao_oficial t
SET preco_minimo_unitario = sub.menor_preco,
    updated_at = NOW()
FROM (
  SELECT tabela_preco_gravacao_id, MIN(preco_unitario) AS menor_preco
  FROM tabela_preco_gravacao_oficial_faixa
  GROUP BY tabela_preco_gravacao_id
) sub
WHERE t.id = sub.tabela_preco_gravacao_id
  AND t.ativo = true
  AND sub.menor_preco < t.preco_minimo_unitario;

-- Documentar semântica oficial
COMMENT ON COLUMN tabela_preco_gravacao_oficial.preco_minimo_unitario IS
  'Piso do preco_unitario das faixas associadas. Garantido pelo trigger trg_check_preco_minimo (criado em GOV-02). Mantido em sync com MIN(faixas.preco_unitario).';
