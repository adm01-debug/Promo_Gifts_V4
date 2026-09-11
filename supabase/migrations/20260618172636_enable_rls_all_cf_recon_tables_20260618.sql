
-- MELHORIA 2b: Habilitar RLS em TODAS as tabelas do schema cf_recon
ALTER TABLE cf_recon.action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cf_recon.crawl_run ENABLE ROW LEVEL SECURITY;
ALTER TABLE cf_recon.metric_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE cf_recon.remediation ENABLE ROW LEVEL SECURITY;

-- Revogar acesso de roles públicas
REVOKE ALL PRIVILEGES ON cf_recon.action_log FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON cf_recon.crawl_run FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON cf_recon.metric_snapshot FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON cf_recon.remediation FROM anon, authenticated;

-- Garantir acesso ao service_role
GRANT ALL PRIVILEGES ON cf_recon.action_log TO service_role;
GRANT ALL PRIVILEGES ON cf_recon.crawl_run TO service_role;
GRANT ALL PRIVILEGES ON cf_recon.metric_snapshot TO service_role;
GRANT ALL PRIVILEGES ON cf_recon.remediation TO service_role;
;
