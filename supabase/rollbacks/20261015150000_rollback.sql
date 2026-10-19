-- Rollback de 20261015150000_admin_active_sessions_rpc.sql
-- Remove as RPCs de administração de sessões ativas.
DROP FUNCTION IF EXISTS public.admin_active_sessions();
DROP FUNCTION IF EXISTS public.admin_revoke_user_sessions(uuid);
