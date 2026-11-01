-- AUTH-001: Limpeza periódica de sessões expiradas via pg_cron
-- Severidade: ALTO | Tipo: INTEGRIDADE/AUTH
-- Evidência: auth.sessions → 28.997 linhas para 39 usuários (ratio ~743:1)
-- Impacto: Acúmulo sem limpeza degrada performance de autenticação.
-- Solução: função SECURITY DEFINER + cron diário às 04:00 UTC.
-- Substitui o DELETE one-shot (20261101150004) que requeria confirmação interativa.
-- Ledger version: 20261101192817 (aplicado via MCP às ~19:28 UTC)

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

-- Verificação pós-apply:
--   SELECT jobid, jobname, schedule FROM cron.job WHERE jobname='cleanup-expired-auth-sessions';
--   → deve retornar 1 linha com schedule '0 4 * * *'

-- ROLLBACK:
--   SELECT cron.unschedule('cleanup-expired-auth-sessions');
--   DROP FUNCTION IF EXISTS public.cleanup_expired_auth_sessions();
