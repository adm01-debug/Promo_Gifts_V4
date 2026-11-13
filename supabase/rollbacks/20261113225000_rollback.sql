-- Rollback: 20261113225000_sec_revoke_anon_authenticated_net_supabase_functions
-- Restaura os grants revogados (estado de produção em 2026-11-13: ALL (arwdDxtm) direto a anon/authenticated
-- em supabase_functions.hooks e .migrations; USAGE nos schemas). Os GRANTs em net.* e nos schemas só têm
-- efeito se executados por supabase_admin (owner) — como postgres são no-op, igual aos REVOKEs.
-- Reabre a leitura/escrita anônima dessas tabelas pela Data API enquanto net/supabase_functions
-- estiverem no db_schema do PostgREST.

GRANT ALL PRIVILEGES ON TABLE supabase_functions.hooks, supabase_functions.migrations TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE net._http_response, net.http_request_queue TO anon, authenticated;
GRANT USAGE ON SCHEMA net, supabase_functions TO anon, authenticated;
