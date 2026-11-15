-- Rollback de 20261112120600_admin_execute_role_migration_batch_rpc.sql
-- Remove o wrapper admin_execute_role_migration_batch. A função interna
-- execute_role_migration_batch não é alterada (continua só service_role,
-- estado de SEC P1-2). Depois deste rollback a tela
-- /admin/seguranca/migracao-papeis volta a falhar com 42501 se o front
-- ainda chamar o wrapper — reverta o front junto.
-- Reverta também a entrada do wrapper em .security/lint-0029-allowlist.json e a
-- linha em docs/security/ALLOWLISTS_MEMORY.md (senão o drift gate só avisa "stale").

DROP FUNCTION IF EXISTS public.admin_execute_role_migration_batch(text, text, jsonb, boolean);
