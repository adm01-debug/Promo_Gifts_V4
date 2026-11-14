-- Rollback: 20261113225000_sec_revoke_anon_authenticated_net_supabase_functions
-- Restaura os grants revogados (estado de produção em 2026-11-13: ALL (arwdDxtm) direto a anon/authenticated
-- em supabase_functions.hooks e .migrations; USAGE nos schemas). Os GRANTs em net.* e nos schemas só têm
-- efeito se executados por supabase_admin (owner) — como postgres são no-op, igual aos REVOKEs.
-- Reabre a leitura/escrita anônima dessas tabelas pela Data API enquanto net/supabase_functions
-- estiverem no db_schema do PostgREST.

-- GUARD: schemas/tabelas opcionais ausentes são pulados (mesma guarda da migration).

DO $$
DECLARE
  v_obj text;
BEGIN
  FOREACH v_obj IN ARRAY ARRAY['supabase_functions.hooks', 'supabase_functions.migrations',
                               'net._http_response', 'net.http_request_queue'] LOOP
    IF to_regclass(v_obj) IS NOT NULL THEN
      EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %s TO anon, authenticated', to_regclass(v_obj));
    END IF;
  END LOOP;
  FOREACH v_obj IN ARRAY ARRAY['net', 'supabase_functions'] LOOP
    IF to_regnamespace(v_obj) IS NOT NULL THEN
      EXECUTE format('GRANT USAGE ON SCHEMA %I TO anon, authenticated', v_obj);
    END IF;
  END LOOP;
END
$$;
