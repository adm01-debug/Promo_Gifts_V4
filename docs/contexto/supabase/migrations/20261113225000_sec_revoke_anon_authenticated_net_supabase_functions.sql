-- SEC: fecha o acesso de anon e authenticated aos schemas internos net e supabase_functions,
-- expostos pela Data API (db_schema do PostgREST inclui "net" e "supabase_functions").
-- Severidade: ALTO | Tipo: SEGURANÇA
-- Evidência (2026-11-13, consulta read-only em produção doufsxqlfjyuvxuezpln):
--   has_table_privilege → anon e authenticated têm SELECT/INSERT/UPDATE/DELETE em
--   net._http_response, net.http_request_queue, supabase_functions.hooks e supabase_functions.migrations;
--   has_schema_privilege → USAGE em net e supabase_functions.
--   Probe anônimo (chave publishable + Accept-Profile): GET /rest/v1/_http_response (net) → 200 com linha;
--   GET /rest/v1/migrations (supabase_functions) → 206 com linha; hooks e http_request_queue → 200.
-- Origem dos grants (pg_class.relacl / pg_namespace.nspacl):
--   supabase_functions.hooks e .migrations: grant direto a anon/authenticated por supabase_functions_admin
--     (owner). postgres é membro de supabase_functions_admin → o REVOKE abaixo TEM efeito.
--   net._http_response e net.http_request_queue: grant a PUBLIC por supabase_admin (owner; padrão do
--     pg_net 0.19.5). Schemas net e supabase_functions: USAGE a anon/authenticated (e a PUBLIC em net) por
--     supabase_admin. postgres NÃO é membro de supabase_admin → esses REVOKEs são no-op
--     ("no privileges could be revoked") e o bloco de verificação só registra WARNING. Esses objetos
--     fecham tirando net/supabase_functions do db_schema do PostgREST (config do projeto — dono).
-- Não toca postgres, service_role nem supabase_functions_admin (grants diretos preservados).
-- Risco de regressão: baixo — supabase_functions.http_request() é SECURITY DEFINER (owner
--   supabase_functions_admin); nenhum código em src/ ou supabase/functions/ usa .schema('net'|
--   'supabase_functions') nem Accept-Profile (grep em 2026-11-13, main 835fee0c).
-- Idempotente: REVOKE de privilégio ausente é no-op.
-- GUARD: schemas/tabelas opcionais (supabase_functions só existe com webhooks; net só com pg_net) — sem eles
--   (shadow/replay do CI) cada REVOKE é pulado com NOTICE em vez de abortar com 3F000/42P01.
-- Rollback: supabase/rollbacks/20261113225000_rollback.sql

DO $$
DECLARE
  v_obj text;
BEGIN
  FOREACH v_obj IN ARRAY ARRAY['supabase_functions.hooks', 'supabase_functions.migrations',
                               'net._http_response', 'net.http_request_queue'] LOOP
    IF to_regclass(v_obj) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %s FROM anon, authenticated', to_regclass(v_obj));
    ELSE
      RAISE NOTICE '% não existe; pulando REVOKE', v_obj;
    END IF;
  END LOOP;
  FOREACH v_obj IN ARRAY ARRAY['net', 'supabase_functions'] LOOP
    IF to_regnamespace(v_obj) IS NOT NULL THEN
      EXECUTE format('REVOKE USAGE ON SCHEMA %I FROM anon, authenticated', v_obj);
    ELSE
      RAISE NOTICE 'schema % não existe; pulando REVOKE USAGE', v_obj;
    END IF;
  END LOOP;
END
$$

-- Verificação pós-apply (na mesma transação): falha se supabase_functions.* continuar acessível;
-- WARNING (sem falhar) para net.* e USAGE nos schemas, que só supabase_admin consegue revogar.
DO $$
DECLARE
  v_rem text;
BEGIN
  SELECT string_agg(r || ' ' || p || ' em ' || t, ', ' ORDER BY t, r, p) INTO v_rem
  FROM (VALUES ('anon'), ('authenticated')) rr(r),
       (VALUES ('supabase_functions.hooks'), ('supabase_functions.migrations')) tt(t),
       unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p
  WHERE has_table_privilege(r, to_regclass(t), p);  -- NULL (pulado) se a tabela não existe
  IF v_rem IS NOT NULL THEN
    RAISE EXCEPTION 'supabase_functions.* ainda acessível a anon/authenticated: %', v_rem;
  END IF;

  SELECT string_agg(r || ' ' || p || ' em ' || t, ', ' ORDER BY t, r, p) INTO v_rem
  FROM (VALUES ('anon'), ('authenticated')) rr(r),
       (VALUES ('net._http_response'), ('net.http_request_queue')) tt(t),
       unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) p
  WHERE has_table_privilege(r, to_regclass(t), p);
  IF v_rem IS NOT NULL THEN
    RAISE WARNING 'net.* ainda acessível (grant a PUBLIC por supabase_admin; fecha pelo db_schema do PostgREST): %', v_rem;
  END IF;

  SELECT string_agg(r || ' USAGE em ' || s, ', ' ORDER BY s, r) INTO v_rem
  FROM (VALUES ('anon'), ('authenticated')) rr(r),
       (VALUES ('net'), ('supabase_functions')) ss(s)
  WHERE has_schema_privilege(r, to_regnamespace(s), 'USAGE');
  IF v_rem IS NOT NULL THEN
    RAISE WARNING 'USAGE de schema ainda presente (grant por supabase_admin; fecha pelo db_schema do PostgREST): %', v_rem;
  END IF;
END
$$
