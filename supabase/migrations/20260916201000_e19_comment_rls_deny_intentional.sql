-- E19 — Decidir as 2 tabelas com RLS sem policy
-- Plano: docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md (linhas 458-464)
-- Achado espelhado em docs/SCHEMA_REFERENCE.md §3 P5.
--
-- Tabelas: public.magazine_duplicate_requests e public.anon_catalog_grant_audit_log.
-- Ambas: relrowsecurity=true, zero policies (pg_policies), zero GRANT a anon/
-- authenticated (information_schema.role_table_grants, confirmado ao vivo em
-- 2026-09-16) — hoje só service_role e funções SECURITY DEFINER (que rodam como
-- o owner 'postgres', role com rolbypassrls=true) conseguem ler/escrever.
--
-- Decisão: INTENCIONAL para as duas, com evidência de código, não suposição:
--
-- 1) public.magazine_duplicate_requests — ledger de idempotência de
--    public.magazine_duplicate_v2(...) (SECURITY DEFINER, owner postgres).
--    A função faz SELECT/INSERT diretamente nesta tabela dentro do seu próprio
--    corpo (chave de idempotência actor_id+idempotency_key); a tabela nunca é
--    exposta em SELECT direto ao cliente — só o resultado transformado (jsonb)
--    da função volta pela API. anon não tem EXECUTE nesta função (só
--    authenticated, com auth.uid() obrigatório — RAISE EXCEPTION
--    'magazine_auth_required' caso contrário).
--
-- 2) public.anon_catalog_grant_audit_log — log de auditoria escrito por
--    public.fn_anon_catalog_grant_audit_run() (SECURITY DEFINER, owner postgres),
--    chamada pelo cron job ativo 'anon-catalog-grant-audit-6h' (jobid 303,
--    '0 */6 * * *', confirmado ativo em cron.job em 2026-09-16). A função grava
--    o resultado de fn_verify_anon_catalog_grants() — é o próprio mecanismo que
--    monitora o achado P1/E22 (anon sem GRANT de escrita) ao longo do tempo.
--    Não tem nenhum consumidor em src/ ou supabase/functions/ (grep confirmado)
--    — é só trilha de auditoria interna, não deveria ser lida por ninguém além
--    de quem investiga um incidente.
--
-- Ação: tornar a intenção explícita via COMMENT ON TABLE (não muda
-- comportamento de acesso — RLS sem policy já nega tudo por padrão a
-- não-owner/não-bypassrls). Ver docs/E19_RLS_SEM_POLICY_2026-09-16.md para o
-- levantamento completo e a nota sobre a migration 20260716000055 (sweep
-- dinâmico, nunca aplicada, que resolveria o lint rls_enabled_no_policy da
-- Supabase de forma complementar — decisão separada, fora desta migration).

DO $precondition$
BEGIN
  IF to_regclass('public.magazine_duplicate_requests') IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: public.magazine_duplicate_requests não existe';
  END IF;
  IF to_regclass('public.anon_catalog_grant_audit_log') IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: public.anon_catalog_grant_audit_log não existe';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('magazine_duplicate_requests', 'anon_catalog_grant_audit_log')
  ) THEN
    RAISE EXCEPTION 'Precondição falhou: uma das duas tabelas já tem policy — estado mudou desde o levantamento de 2026-09-16, reavaliar antes de comentar';
  END IF;
END;
$precondition$;

COMMENT ON TABLE public.magazine_duplicate_requests IS
  'RLS deny-all intencional (E19, 2026-09-16): RLS ligada, zero policies — só '
  'service_role e a função SECURITY DEFINER public.magazine_duplicate_v2(...) '
  '(owner postgres, bypassrls) leem/escrevem. Ledger de idempotência de '
  'duplicação de revista (actor_id+idempotency_key); nunca exposta em SELECT '
  'direto ao cliente. Ver docs/E19_RLS_SEM_POLICY_2026-09-16.md.';

COMMENT ON TABLE public.anon_catalog_grant_audit_log IS
  'RLS deny-all intencional (E19, 2026-09-16): RLS ligada, zero policies — só '
  'service_role e a função SECURITY DEFINER public.fn_anon_catalog_grant_audit_run() '
  '(owner postgres, bypassrls) escrevem. Log de auditoria do próprio mecanismo '
  'anon-sem-escrita (P1/E22), alimentado pelo cron ativo '
  '''anon-catalog-grant-audit-6h'' (jobid 303, a cada 6h). Sem consumidor em '
  'src/ ou supabase/functions/ — só trilha para investigação de incidente. '
  'Ver docs/E19_RLS_SEM_POLICY_2026-09-16.md.';

DO $postcondition$
BEGIN
  IF obj_description('public.magazine_duplicate_requests'::regclass, 'pg_class') IS NULL THEN
    RAISE EXCEPTION 'Pós-condição falhou: comentário de magazine_duplicate_requests não foi gravado';
  END IF;
  IF obj_description('public.anon_catalog_grant_audit_log'::regclass, 'pg_class') IS NULL THEN
    RAISE EXCEPTION 'Pós-condição falhou: comentário de anon_catalog_grant_audit_log não foi gravado';
  END IF;

  -- Confirma que nada de comportamento de acesso mudou (RLS continua ligada, 0 policies).
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN ('magazine_duplicate_requests', 'anon_catalog_grant_audit_log')
      AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Pós-condição falhou: RLS foi desligada em uma das tabelas — não era o objetivo desta migration';
  END IF;
END;
$postcondition$;
