-- Restaura a aba "Confiabilidade de Fornecedores" (/estoque) via RPC com guarda de papel,
-- sem GRANT direto na MV.
-- Causa: 20260716000029 / 20260716191641 revogaram SELECT de authenticated em
-- public.mv_supplier_reliability (MV rotulada "admin only" em 20260716000029; lints
-- materialized_view_in_api e pg_graphql_authenticated_table_exposed). O front
-- (useSupplierReliabilityServer.ts) seguiu lendo a MV direto -> 42501, aba sempre em erro.
-- Solucao: mesmo molde da SB-0003 (20261112011000, fn_get_rupture_alerts, MV irma da mesma
-- lista de 20260716000029). A MV continua fora da API; a funcao SECURITY DEFINER devolve as
-- linhas so para supervisor+ (public.is_supervisor_or_above), mantendo a intencao "admin only".
-- Abaixo de supervisor a funcao retorna vazio e o front mostra "Sem permissao".
-- DECISAO DO DONO PENDENTE (PR fica aberta, Git 7): esta e a opcao A (supervisor+). A opcao B
-- (todo usuario logado) so entra com aprovacao explicita do dono registrada na PR, trocando o
-- WHERE e este cabecalho/COMMENT.
-- Idempotente: CREATE OR REPLACE + REVOKE/GRANT repetiveis.
-- Rollback: DROP FUNCTION IF EXISTS public.fn_get_supplier_reliability();  (supabase/rollbacks/20261112120000_rollback.sql)

CREATE OR REPLACE FUNCTION public.fn_get_supplier_reliability()
RETURNS SETOF public.mv_supplier_reliability
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
  SELECT * FROM public.mv_supplier_reliability
  WHERE public.is_supervisor_or_above((SELECT auth.uid()))
$$

COMMENT ON FUNCTION public.fn_get_supplier_reliability() IS
  'Aba Confiabilidade de Fornecedores (/estoque). SECURITY DEFINER sobre mv_supplier_reliability '
  '(MV admin only, sem SELECT para anon/authenticated desde 20260716191641). Retorna linhas so '
  'para is_supervisor_or_above(auth.uid()); demais papeis recebem vazio. '
  'EXECUTE: authenticated, service_role; anon/PUBLIC nao.'

REVOKE ALL ON FUNCTION public.fn_get_supplier_reliability() FROM PUBLIC

REVOKE EXECUTE ON FUNCTION public.fn_get_supplier_reliability() FROM PUBLIC, anon

GRANT EXECUTE ON FUNCTION public.fn_get_supplier_reliability() TO authenticated, service_role

NOTIFY pgrst, 'reload schema'
