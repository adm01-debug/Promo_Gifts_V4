-- ═══════════════════════════════════════════════════════════════
-- GAP #1 (P1): FECHAR A TORNEIRA — default privilege (role postgres)
-- ═══════════════════════════════════════════════════════════════
--
-- LIMITAÇÃO: Supabase Cloud não permite ALTER DEFAULT PRIVILEGES FOR ROLE
-- supabase_admin via SQL. Apenas o role postgres (que o MCP usa) é alterável.
-- Tabelas criadas pelo Dashboard (supabase_admin) continuam com o default antigo.
-- A fix completa requer o painel do Supabase Dashboard (Settings > Database).
--
-- O QUE ESTA MIGRATION FAZ:
-- Fecha o default privilege do role postgres em public.
-- Migrations SQL, pg_cron e edge functions criam objetos como postgres.
-- Isso cobre a maioria dos objetos criados automaticamente.

-- Tabelas: remove escrita para anon (mantém SELECT para catálogo público)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE ON TABLES FROM anon;

-- Functions: anon não executa functions novas por padrão
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- Sequences: anon não precisa de rwU em sequences novas
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE ON SEQUENCES FROM anon;;
