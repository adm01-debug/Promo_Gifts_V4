-- Rollback de 20261125180000_fix_comment_v_tabela_gravacao_publica.sql
--
-- Devolve o texto VIVO antes desta migration, gravado por
-- 20261122180000_restore_definer_views_p06_e_compras.sql (linha 111).
--
-- ATENCAO: esse texto nao desmente a afirmacao antiga de 20260717173348 ("custo_setup_por_cor e
-- custo_manuseio_por_peca excluidos") nem explica que as duas colunas sao BOOLEAN, entao reverter
-- devolve a leitura que induziu auditoria a erro. So faz sentido se a 20261125150000 for retirada
-- do ledger por decisao explicita do dono.

COMMENT ON VIEW public.v_tabela_preco_gravacao_oficial_public IS
  'Tabela de preco de gravacao oficial (SECURITY DEFINER). NAO religar security_invoker=true nem re-expor a tabela base ao anon: exigiria GRANT em 37 colunas. Regressao de 2026-11-22 revertida pela 20261122180000.';
