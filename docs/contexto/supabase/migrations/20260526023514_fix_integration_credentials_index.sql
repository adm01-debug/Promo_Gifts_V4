-- índice no campo real de lookup (provider+is_active e secret_name)
CREATE INDEX IF NOT EXISTS idx_integration_creds_provider
  ON public.integration_credentials(provider, is_active);

CREATE INDEX IF NOT EXISTS idx_integration_creds_secret_name
  ON public.integration_credentials(secret_name)
  WHERE is_active = true;
