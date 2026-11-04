ALTER TABLE public.user_token_revocations
  ADD COLUMN IF NOT EXISTS token_jti   text,
  ADD COLUMN IF NOT EXISTS expires_at  timestamptz,
  ADD COLUMN IF NOT EXISTS reason      text;

-- Índice para token individual (sem predicado now() — não é IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_token_revocations_jti
  ON public.user_token_revocations(token_jti)
  WHERE token_jti IS NOT NULL;

-- Índice para cleanup por expiração
CREATE INDEX IF NOT EXISTS idx_token_revocations_expires
  ON public.user_token_revocations(expires_at)
  WHERE expires_at IS NOT NULL;

-- Índice para revogação em massa por user
CREATE INDEX IF NOT EXISTS idx_token_revocations_user_id
  ON public.user_token_revocations(user_id, revoked_at DESC);

-- Atualiza cron com limpeza inteligente (tokens expirados + entradas antigas)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-token-revocations') THEN
    PERFORM cron.unschedule('cleanup-expired-token-revocations');
  END IF;
END $$;

SELECT cron.schedule(
  'cleanup-expired-token-revocations',
  '0 * * * *',
  $$
  DELETE FROM user_token_revocations
  WHERE
    (expires_at IS NOT NULL AND expires_at < now() - interval '5 minutes')
    OR (expires_at IS NULL AND revoked_at < now() - interval '30 days');
  $$
);
