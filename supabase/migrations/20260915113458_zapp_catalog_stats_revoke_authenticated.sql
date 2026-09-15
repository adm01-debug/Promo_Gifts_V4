-- ============================================================================
-- Forward-only: remove EXECUTE acidental de public.zapp_catalog_stats()
-- do role `authenticated`.
-- ============================================================================
-- CAUSA RAIZ
-- A migration 20260912205759 (catalog_e24_zapp_catalog_stats) declarou em
-- comentário "grant só ao role usado pela service key" e executou:
--     revoke all on function ... from public, anon;
--     grant execute on function ... to service_role;
-- Em PostgreSQL vanilla isso bastaria: apenas PUBLIC recebe EXECUTE por
-- padrão. Neste projeto, porém, o ALTER DEFAULT PRIVILEGES concede EXECUTE
-- a `authenticated` explicitamente em toda função nova criada por `postgres`
-- no schema `public`:
--     pg_default_acl (postgres/public, objtype=f) =
--       {=X/postgres,postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
-- Como `authenticated` nunca foi revogado, a função ficou executável por
-- qualquer usuário autenticado — divergindo da intenção declarada.
--
-- EVIDÊNCIA (medida em 2026-09-14 via pg_catalog, conforme CLAUDE.md REGRA #8)
--   proacl = {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   has_function_privilege('authenticated', 'public.zapp_catalog_stats()', 'EXECUTE') = true
--   has_function_privilege('anon',          'public.zapp_catalog_stats()', 'EXECUTE') = false
--
-- DETECÇÃO
-- Gate `check:lint-0029` (scripts/check-lint-0029-drift.mjs --require-live),
-- finding: 0029_authenticated_security_definer_function_executable.
-- O finding é legítimo — NÃO deve ser silenciado via allowlist, porque a
-- exposição é acidental, não uma exceção intencional.
--
-- IMPACTO DO REVOKE
-- Nenhum consumidor conhecido é afetado:
--   - nenhum call site em src/ nem em supabase/functions/ (busca por
--     `zapp_catalog_stats` e por `.rpc(` em 2026-09-14);
--   - nenhuma chamada RPC registrada em edge_logs entre 2026-09-12 e 2026-09-14;
--   - nenhuma dependência em pg_depend (nenhuma view/trigger/função a usa).
-- O consumidor pretendido (painel ZAPP, via service key) continua com acesso
-- por `service_role`, que é preservado e verificado na pós-condição.
--
-- A função em si é mantida: retorna apenas contagens agregadas do catálogo,
-- sem linhas individuais nem dados pessoais.
-- ============================================================================

DO $precondition$
BEGIN
  IF to_regprocedure('public.zapp_catalog_stats()') IS NULL THEN
    RAISE EXCEPTION
      'Precondition failed: public.zapp_catalog_stats() nao existe — revisar antes de prosseguir';
  END IF;
END
$precondition$;

REVOKE EXECUTE ON FUNCTION public.zapp_catalog_stats() FROM authenticated;

COMMENT ON FUNCTION public.zapp_catalog_stats() IS
  'KPIs agregados do catalogo (total, estoque, destaques, novidades, kits, '
  'categorias raiz, fornecedores ativos e serie mensal de 6 meses) para o '
  'painel ZAPP. Acesso restrito a service_role: NAO conceder a authenticated '
  'nem a anon. Origem: catalog_e24 (20260912205759); EXECUTE de authenticated '
  'revogado em 20260915113458 apos finding do lint 0029.';

DO $postcondition$
BEGIN
  IF has_function_privilege('authenticated', 'public.zapp_catalog_stats()', 'EXECUTE') THEN
    RAISE EXCEPTION
      'Postcondition failed: authenticated ainda possui EXECUTE em public.zapp_catalog_stats()';
  END IF;
  IF has_function_privilege('anon', 'public.zapp_catalog_stats()', 'EXECUTE') THEN
    RAISE EXCEPTION
      'Postcondition failed: anon possui EXECUTE em public.zapp_catalog_stats()';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.zapp_catalog_stats()', 'EXECUTE') THEN
    RAISE EXCEPTION
      'Postcondition failed: service_role perdeu EXECUTE em public.zapp_catalog_stats()';
  END IF;
END
$postcondition$;
