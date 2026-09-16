-- E23 — FORCE RLS e revogação em tabelas de segredo
-- Plano: docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md (linhas 494-501)
--
-- Tabelas alvo (5 das 6 do plano — mcp_api_keys já tem FORCE, confirmado ao
-- vivo em 2026-09-16, fora desta migration): integration_credentials,
-- external_connections, secret_rotation_log, step_up_tokens,
-- user_token_revocations.
--
-- Achado central (muda a leitura de risco do plano): as 6 tabelas são
-- owned by 'postgres'. O papel 'postgres' neste projeto tem
-- rolbypassrls=true (confirmado em pg_roles em 2026-09-16) — NÃO é
-- rolsuper, mas BYPASSRLS é um atributo independente de superusuário que
-- ignora RLS incondicionalmente, com ou sem FORCE ROW LEVEL SECURITY
-- (FORCE só muda o comportamento do owner quando o owner NÃO tem
-- BYPASSRLS — ver documentação do Postgres sobre ALTER TABLE ... FORCE ROW
-- LEVEL SECURITY). service_role também tem rolbypassrls=true.
--
-- Consequência prática: aplicar FORCE nestas 5 tabelas NÃO muda o
-- comportamento de nenhuma função SECURITY DEFINER (todas as encontradas
-- que tocam estas tabelas são owned by postgres — 11 funções confirmadas
-- via pg_proc.prosrc em 2026-09-16: audit_mcp_api_keys_changes,
-- auto_revoke_orphan_full_keys, check_mcp_abuse_threshold,
-- cleanup_expired_step_up, cleanup_expired_step_up_tokens,
-- fn_admin_sync_external_connections, force_logout_all_users,
-- guard_mcp_api_keys_writes, sync_external_connections_from_credentials
-- (2 sobrecargas), trg_auto_revoke_mcp_on_role_loss) nem de nenhuma edge
-- function que use a service_role key (secrets-manager, mcp-keys-issue/
-- revoke/rotate/update — todas confirmadas via grep tocando
-- integration_credentials/external_connections/mcp_api_keys via
-- admin.from(...) com SERVICE_ROLE_KEY). Todas essas vias já bypassam RLS
-- pelo atributo do papel, não pela ausência de FORCE.
--
-- FORCE é, portanto, defesa em profundidade / postura documentada — não uma
-- mudança funcional hoje — e alinha as 5 tabelas ao padrão já em produção em
-- mcp_api_keys. É seguro justamente porque não muda nada para os únicos
-- consumidores legítimos (postgres/service_role, ambos bypassrls).
--
-- REVOKE ALL FROM anon: confirmado que anon já não tem NENHUM grant nestas
-- 5 tabelas hoje (information_schema.role_table_grants vazio para anon nas
-- 5, checado em 2026-09-16) — o REVOKE é no-op sobre o estado atual, mas
-- fecha a porta a qualquer GRANT futuro acidental (ex.: um script de
-- hardening genérico que faça 'GRANT SELECT ON ALL TABLES IN SCHEMA
-- public TO anon' sem exclusão explícita). 'authenticated' NÃO é tocado —
-- tem policies reais (1 a 4 por tabela) que sustentam acesso legítimo do
-- usuário dono do recurso (ex.: step_up_tokens via RPCs SECURITY INVOKER
-- chamadas como o próprio usuário, como verify_step_up_otp).
--
-- Ver docs/E23_FORCE_RLS_SEGREDO_2026-09-16.md para o levantamento completo.

DO $precondition$
BEGIN
  -- A premissa de segurança inteira desta migration depende disto. Se deixou
  -- de ser verdade, PARAR — o raciocínio acima não se sustenta mais.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres' AND rolbypassrls) THEN
    RAISE EXCEPTION 'Precondição falhou: role postgres não tem mais rolbypassrls — a premissa desta migration (FORCE é no-op para os owners atuais) não é mais válida, reavaliar risco por tabela antes de prosseguir';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role' AND rolbypassrls) THEN
    RAISE EXCEPTION 'Precondição falhou: role service_role não tem mais rolbypassrls — reavaliar antes de prosseguir';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('integration_credentials', 'external_connections', 'secret_rotation_log', 'step_up_tokens', 'user_token_revocations')
      AND c.relowner::regrole::text <> 'postgres'
  ) THEN
    RAISE EXCEPTION 'Precondição falhou: uma das 5 tabelas mudou de owner desde o levantamento de 2026-09-16 — reavaliar antes de prosseguir';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('integration_credentials', 'external_connections', 'secret_rotation_log', 'step_up_tokens', 'user_token_revocations')
      AND c.relforcerowsecurity
  ) THEN
    RAISE EXCEPTION 'Precondição falhou: uma das 5 tabelas já tem FORCE ROW LEVEL SECURITY — migration não é idempotente para este passo, investigar';
  END IF;
END;
$precondition$;

ALTER TABLE public.integration_credentials FORCE ROW LEVEL SECURITY;
ALTER TABLE public.external_connections    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.secret_rotation_log     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.step_up_tokens          FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_token_revocations  FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.integration_credentials FROM anon;
REVOKE ALL ON public.external_connections    FROM anon;
REVOKE ALL ON public.secret_rotation_log     FROM anon;
REVOKE ALL ON public.step_up_tokens          FROM anon;
REVOKE ALL ON public.user_token_revocations  FROM anon;

DO $postcondition$
DECLARE
  v_missing_force text;
  v_anon_grants integer;
BEGIN
  SELECT string_agg(c.relname, ', ')
    INTO v_missing_force
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('integration_credentials', 'external_connections', 'secret_rotation_log', 'step_up_tokens', 'user_token_revocations')
    AND NOT c.relforcerowsecurity;

  IF v_missing_force IS NOT NULL THEN
    RAISE EXCEPTION 'Pós-condição falhou: FORCE ROW LEVEL SECURITY não aplicado em: %', v_missing_force;
  END IF;

  SELECT count(*) INTO v_anon_grants
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND grantee = 'anon'
    AND table_name IN ('integration_credentials', 'external_connections', 'secret_rotation_log', 'step_up_tokens', 'user_token_revocations');

  IF v_anon_grants > 0 THEN
    RAISE EXCEPTION 'Pós-condição falhou: anon ainda tem % grant(s) nas tabelas de segredo após REVOKE ALL', v_anon_grants;
  END IF;

  -- mcp_api_keys não foi tocada por esta migration — confirma que continua com FORCE (estado prévio, não regressão).
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'mcp_api_keys' AND relnamespace = 'public'::regnamespace AND relforcerowsecurity) THEN
    RAISE EXCEPTION 'Pós-condição falhou: mcp_api_keys perdeu FORCE ROW LEVEL SECURITY — não deveria ter sido tocada por esta migration';
  END IF;
END;
$postcondition$;
