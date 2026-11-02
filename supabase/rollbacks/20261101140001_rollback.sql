-- Rollback de 20261101140001_sb0001_remove_auth_users_realtime.sql
-- Restaura auth.users na publication supabase_realtime.
-- ATENÇÃO: restaurar auth.users na publicação expõe dados PII de todos os usuários
-- a qualquer subscriber autenticado. Aplicar somente se estritamente necessário.
ALTER PUBLICATION supabase_realtime ADD TABLE auth.users;
