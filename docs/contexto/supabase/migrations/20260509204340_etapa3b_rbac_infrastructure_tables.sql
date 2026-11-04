-- ============================================================
-- Etapa 3B: 11 tabelas de infraestrutura RBAC + auditoria
-- (correção: removido now() de índice parcial)
-- ============================================================

-- ════════════════ 1) admin_audit_log ════════════════
CREATE TABLE public.admin_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  action        text NOT NULL,
  resource_type text NOT NULL,
  resource_id   text,
  details       jsonb DEFAULT '{}'::jsonb,
  ip_address    text,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_audit_log_user_id    ON public.admin_audit_log(user_id);
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_action     ON public.admin_audit_log(action);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Devs can read audit logs"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.can_view_audit_logs(auth.uid()));

CREATE POLICY "Supervisors can insert audit entries"
  ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_supervisor_or_above(auth.uid()) AND user_id = auth.uid());

COMMENT ON TABLE public.admin_audit_log IS 
  'Log imutável de ações administrativas. Sem UPDATE/DELETE. Schema oficial migrations/20260326191912.';

-- ════════════════ 2) ai_usage_logs ════════════════
CREATE TABLE public.ai_usage_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider        text NOT NULL,
  model           text,
  operation       text NOT NULL,
  tokens_input    integer DEFAULT 0,
  tokens_output   integer DEFAULT 0,
  cost_cents      integer DEFAULT 0,
  status          text NOT NULL DEFAULT 'success',
  error_message   text,
  metadata        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_usage_logs_user_id    ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_logs_provider   ON public.ai_usage_logs(provider, created_at DESC);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all AI usage logs"
  ON public.ai_usage_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ════════════════ 3) ai_usage_quotas ════════════════
CREATE TABLE public.ai_usage_quotas (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope                text NOT NULL CHECK (scope IN ('global', 'user', 'role')),
  scope_id             text NOT NULL,
  provider             text NOT NULL,
  period               text NOT NULL CHECK (period IN ('daily', 'monthly')),
  limit_tokens         bigint,
  limit_cost_cents     bigint,
  current_tokens       bigint NOT NULL DEFAULT 0,
  current_cost_cents   bigint NOT NULL DEFAULT 0,
  period_start         date NOT NULL,
  period_end           date NOT NULL,
  metadata             jsonb DEFAULT '{}'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE(scope, scope_id, provider, period, period_start)
);
CREATE INDEX idx_ai_usage_quotas_scope ON public.ai_usage_quotas(scope, scope_id);

ALTER TABLE public.ai_usage_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage quotas"
  ON public.ai_usage_quotas FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ════════════════ 4) bot_detection_log ════════════════
CREATE TABLE public.bot_detection_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address      text NOT NULL,
  user_agent      text,
  detection_type  text NOT NULL,
  score           numeric(3,2),
  action_taken    text NOT NULL DEFAULT 'allowed',
  metadata        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bot_detection_log_ip         ON public.bot_detection_log(ip_address);
CREATE INDEX idx_bot_detection_log_created_at ON public.bot_detection_log(created_at DESC);

ALTER TABLE public.bot_detection_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read bot log"
  ON public.bot_detection_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ════════════════ 5) external_connections_sync_log ════════════════
CREATE TABLE public.external_connections_sync_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id       uuid,
  connection_name     text NOT NULL,
  sync_type           text NOT NULL DEFAULT 'incremental',
  status              text NOT NULL DEFAULT 'running',
  records_processed   integer DEFAULT 0,
  records_failed      integer DEFAULT 0,
  duration_ms         integer,
  error_message       text,
  metadata            jsonb DEFAULT '{}'::jsonb,
  started_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz
);
CREATE INDEX idx_ec_sync_log_connection_id ON public.external_connections_sync_log(connection_id);
CREATE INDEX idx_ec_sync_log_status        ON public.external_connections_sync_log(status, started_at DESC);

ALTER TABLE public.external_connections_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read external_connections_sync_log"
  ON public.external_connections_sync_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ════════════════ 6) integration_credentials ════════════════
CREATE TABLE public.integration_credentials (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider          text NOT NULL,
  name              text NOT NULL,
  description       text,
  credential_type   text NOT NULL DEFAULT 'api_key',
  encrypted_value   text NOT NULL,
  metadata          jsonb DEFAULT '{}'::jsonb,
  is_active         boolean NOT NULL DEFAULT true,
  expires_at        timestamptz,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, name)
);
CREATE INDEX idx_integration_credentials_provider ON public.integration_credentials(provider, is_active);

ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view integration credentials"
  ON public.integration_credentials FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert integration credentials"
  ON public.integration_credentials FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update integration credentials"
  ON public.integration_credentials FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete integration credentials"
  ON public.integration_credentials FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

COMMENT ON COLUMN public.integration_credentials.encrypted_value IS 
  'Valor criptografado. Edge secrets-manager faz encrypt/decrypt usando vault. Nunca em texto plano.';

-- ════════════════ 7) inbound_webhook_endpoints ════════════════
CREATE TABLE public.inbound_webhook_endpoints (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  name          text NOT NULL,
  description   text,
  secret_key    text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  allowed_ips   text[],
  metadata      jsonb DEFAULT '{}'::jsonb,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inbound_webhook_endpoints_active ON public.inbound_webhook_endpoints(is_active, slug);

ALTER TABLE public.inbound_webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage inbound_webhook_endpoints"
  ON public.inbound_webhook_endpoints FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ════════════════ 8) inbound_webhook_events ════════════════
CREATE TABLE public.inbound_webhook_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id       uuid REFERENCES public.inbound_webhook_endpoints(id) ON DELETE CASCADE,
  event_type        text NOT NULL,
  payload           jsonb NOT NULL,
  headers           jsonb DEFAULT '{}'::jsonb,
  ip_address        text,
  signature_valid   boolean,
  processed         boolean NOT NULL DEFAULT false,
  processed_at      timestamptz,
  error_message     text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inbound_webhook_events_endpoint_id ON public.inbound_webhook_events(endpoint_id, created_at DESC);
CREATE INDEX idx_inbound_webhook_events_processed   ON public.inbound_webhook_events(processed, created_at);

ALTER TABLE public.inbound_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read inbound_webhook_events"
  ON public.inbound_webhook_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete inbound_webhook_events"
  ON public.inbound_webhook_events FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- ════════════════ 9) ip_access_control ════════════════
CREATE TABLE public.ip_access_control (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address   text NOT NULL,
  list_type    text NOT NULL CHECK (list_type IN ('allow', 'block')),
  reason       text,
  expires_at   timestamptz,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata     jsonb DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ip_address, list_type)
);
CREATE INDEX idx_ip_access_control_lookup  ON public.ip_access_control(ip_address, list_type);
CREATE INDEX idx_ip_access_control_expires ON public.ip_access_control(expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE public.ip_access_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ip_access_control"
  ON public.ip_access_control FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ════════════════ 10) login_attempts ════════════════
CREATE TABLE public.login_attempts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address      text NOT NULL,
  user_agent      text,
  success         boolean NOT NULL,
  failure_reason  text,
  metadata        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_attempts_email      ON public.login_attempts(email, created_at DESC);
CREATE INDEX idx_login_attempts_ip         ON public.login_attempts(ip_address, created_at DESC);
CREATE INDEX idx_login_attempts_user_id    ON public.login_attempts(user_id, created_at DESC);
CREATE INDEX idx_login_attempts_failures   ON public.login_attempts(success, ip_address, created_at DESC);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Devs can view login attempts"
  ON public.login_attempts FOR SELECT TO authenticated
  USING (public.can_view_audit_logs(auth.uid()));

-- ════════════════ 11) file_scan_logs ════════════════
CREATE TABLE public.file_scan_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name       text NOT NULL,
  file_size       bigint,
  file_hash       text,
  mime_type       text,
  scan_provider   text NOT NULL DEFAULT 'virustotal',
  scan_result     text NOT NULL DEFAULT 'pending',
  scan_response   jsonb DEFAULT '{}'::jsonb,
  storage_path    text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_file_scan_logs_user_id  ON public.file_scan_logs(user_id);
CREATE INDEX idx_file_scan_logs_hash     ON public.file_scan_logs(file_hash);
CREATE INDEX idx_file_scan_logs_result   ON public.file_scan_logs(scan_result, created_at DESC);

ALTER TABLE public.file_scan_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read file_scan_logs"
  ON public.file_scan_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users read own file_scan_logs"
  ON public.file_scan_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.file_scan_logs IS 
  'Auditoria de scans VirusTotal em uploads. user_id obrigatório (manifest edge secure-upload).';

-- ════════════════ Triggers updated_at ════════════════
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_ai_usage_quotas_updated_at 
  BEFORE UPDATE ON public.ai_usage_quotas
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_integration_credentials_updated_at 
  BEFORE UPDATE ON public.integration_credentials
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_inbound_webhook_endpoints_updated_at 
  BEFORE UPDATE ON public.inbound_webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
