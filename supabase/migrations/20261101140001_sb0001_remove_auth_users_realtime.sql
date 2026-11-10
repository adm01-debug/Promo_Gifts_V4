-- SB-0001: Remove auth.users da publication supabase_realtime
-- Severidade: CRÍTICO | Tipo: SEGURANÇA
-- Evidência: SELECT pubname, schemaname, tablename FROM pg_publication_tables
--            WHERE pubname = 'supabase_realtime';
--            → [{pubname:"supabase_realtime","schemaname":"auth","tablename":"users"}]
-- Impacto: Qualquer subscriber autenticado recebe INSERT/UPDATE/DELETE de auth.users
--          incluindo email, phone, raw_user_meta_data, encrypted_password de todos os usuários.
-- Risco de regressão: baixo — nenhum canal do repo assina auth.users via realtime.
-- Verificação pré-apply: SELECT count(*) FROM pg_publication_tables
--   WHERE pubname = 'supabase_realtime' AND tablename = 'users'; → deve retornar 1
-- Verificação pós-apply: mesma query → deve retornar 0

ALTER PUBLICATION supabase_realtime DROP TABLE auth.users;

-- ROLLBACK:
-- ALTER PUBLICATION supabase_realtime ADD TABLE auth.users;
