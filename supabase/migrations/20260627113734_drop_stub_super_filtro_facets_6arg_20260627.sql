-- ============================================================
-- MELHORIA 1: Remover fn_super_filtro_facets overload 6-arg (stub morto)
-- Body: SELECT 'test'::text, 'test'::text, 0::bigint WHERE false
-- → retorna SEMPRE vazio. Nunca foi chamada (pg_stat_user_functions=NULL).
-- 0 refs: frontend, crons, migrations, JSON, funções de negócio.
-- Retorna TABLE diferente do 17-arg (sem facet_slug, count vs product_count).
-- Ter 2 overloads confunde PostgREST ao resolver /rpc/fn_super_filtro_facets.
-- Após DROP: apenas o 17-arg (versão completa e atual) permanece.
-- Verificado: refs em audit_security_definer_acl e fn_auto_revoke_secdef_public_execute
-- são scanners de pg_proc, não callers reais.
-- ============================================================
DROP FUNCTION IF EXISTS public.fn_super_filtro_facets(
  text[], text[], text[], text[], text[], text[]
);;
