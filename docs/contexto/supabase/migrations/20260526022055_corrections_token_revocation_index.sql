-- Índices originais dependem de token_jti/expires_at (colunas ausentes neste schema)
-- Aplicando apenas o job de limpeza, adaptado para revoked_at
SELECT cron.schedule('cleanup-expired-token-revocations','0 * * * *',
  $$DELETE FROM user_token_revocations WHERE revoked_at < NOW() - INTERVAL '30 days'$$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-token-revocations');
