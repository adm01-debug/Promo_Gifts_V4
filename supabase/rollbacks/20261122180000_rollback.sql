-- Rollback de 20261122180000_restore_definer_views_p06_e_compras.sql.
-- Devolve as 7 views ao estado exato anterior: security_invoker=true nas 4 do P06 e nas 3 de
-- compras (estado que a 20261118172500 e a 20261122100000 deixaram).
--
-- ATENCAO: aplicar isto RE-QUEBRA em producao (401 42501) as 7 views listadas abaixo, porque
-- `anon` nao tem GRANT SELECT nas tabelas base. So usar para reverter o estado byte a byte.
-- Os COMMENT ON VIEW anteriores nao sao restaurados por este rollback.

alter view public.v_suppliers_public set (security_invoker = true);
alter view public.v_kit_component_media_public set (security_invoker = true);
alter view public.v_product_compositions_public set (security_invoker = true);
alter view public.v_tabela_preco_gravacao_oficial_public set (security_invoker = true);

alter view public.v_compras_catalogo set (security_invoker = true);
alter view public.v_compras_precos_faixa set (security_invoker = true);
alter view public.v_compras_precos_variante set (security_invoker = true);