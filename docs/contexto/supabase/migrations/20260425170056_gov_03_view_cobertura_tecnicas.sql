CREATE OR REPLACE VIEW v_audit_cobertura_tecnicas AS
SELECT 
  tg.codigo AS grupo,
  tg.nome AS grupo_nome,
  tg.ativo AS catalogo_ativo,
  COUNT(t.id) FILTER (WHERE t.ativo = true) AS tabelas_ativas,
  COUNT(t.id) FILTER (WHERE t.ativo = false) AS tabelas_inativas,
  COUNT(t.id) FILTER (WHERE t.ativo = false 
    AND t.opcoes_modificadores->>'status_classificacao' = 'LEGACY') AS legacy,
  COUNT(t.id) FILTER (WHERE t.ativo = false 
    AND t.opcoes_modificadores->>'status_classificacao' = 'REVIVABLE') AS revivable,
  COUNT(t.id) FILTER (WHERE t.ativo = false 
    AND t.opcoes_modificadores->>'status_classificacao' = 'ARCHIVE') AS archive,
  CASE
    WHEN tg.ativo AND COUNT(t.id) FILTER (WHERE t.ativo) = 0 THEN 'ZUMBI'
    WHEN COUNT(t.id) FILTER (WHERE t.ativo) >= 5 THEN 'FORTE'
    WHEN COUNT(t.id) FILTER (WHERE t.ativo) >= 2 THEN 'OK'
    WHEN COUNT(t.id) FILTER (WHERE t.ativo) = 1 THEN 'FRACO'
    ELSE 'INATIVO'
  END AS status,
  -- Cobertura por categoria
  COUNT(t.id) FILTER (WHERE t.ativo AND t.codigo_tabela LIKE '%-CN-%') AS ativas_caneta,
  COUNT(t.id) FILTER (WHERE t.ativo AND t.codigo_tabela LIKE '%-MOC-%') AS ativas_mochila,
  COUNT(t.id) FILTER (WHERE t.ativo AND t.codigo_tabela LIKE '%-SAC-%') AS ativas_sacochila,
  COUNT(t.id) FILTER (WHERE t.ativo AND t.codigo_tabela LIKE '%-SAE-%') AS ativas_sacola,
  COUNT(t.id) FILTER (WHERE t.ativo AND t.codigo_tabela LIKE '%-CAM-%') AS ativas_camiseta,
  COUNT(t.id) FILTER (WHERE t.ativo AND t.codigo_tabela LIKE '%-CIL-%') AS ativas_cilindrico
FROM tecnicas_gravacao tg
LEFT JOIN tabela_preco_gravacao_oficial t ON t.grupo_tecnica = tg.codigo
GROUP BY tg.codigo, tg.nome, tg.ativo, tg.ordem_exibicao
ORDER BY tg.ordem_exibicao, tg.codigo;

COMMENT ON VIEW v_audit_cobertura_tecnicas IS
'Status de cobertura de cada grupo tecnico. Zero linhas com status=ZUMBI eh o objetivo. Detalha contagens por categoria de produto e classificacao das inativas.';
