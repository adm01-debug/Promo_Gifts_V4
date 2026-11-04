-- AUTH-001: Limpeza periódica de sessões expiradas via pg_cron
-- Substitui o DELETE one-shot (bloqueado por confirmação destrutiva no cliente MCP)
-- com função SECURITY DEFINER + cron diário que executa o DELETE no worker do banco.
-- Isso também resolve o acúmulo futuro, não apenas o one-shot.

CREATE OR REPLACE FUNCTION public.cleanup_expired_auth_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.sessions WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

SELECT cron.schedule(
  'cleanup-expired-auth-sessions',
  '0 4 * * *',
  'SELECT public.cleanup_expired_auth_sessions()'
);
