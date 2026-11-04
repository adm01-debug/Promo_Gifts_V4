-- Drift fix: alinhar `integration_credentials` ao contrato esperado por
-- supabase/functions/secrets-manager/index.ts e criar `secret_rotation_log`.
-- Mesma estratégia validada em ai_usage_schema_alignment_v1, mas com ALTER
-- (não DROP) porque a tabela tem 0 rows mas colunas extras úteis.

-- ============================================================
-- 1) integration_credentials: adicionar colunas faltantes
-- ============================================================
ALTER TABLE public.integration_credentials
  ADD COLUMN IF NOT EXISTS notes        text,
  ADD COLUMN IF NOT EXISTS updated_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS masked_suffix text,
  ADD COLUMN IF NOT EXISTS length        int;

-- `provider` é NOT NULL sem default → resolver via trigger derivando do prefixo.
-- Não dropamos a coluna nem o NOT NULL: trigger preenche ANTES do constraint check.

-- ============================================================
-- 2) Trigger: derivar provider + length + masked_suffix
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_integration_credentials_derive()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Derivar provider do prefixo do secret_name se não fornecido
  IF NEW.provider IS NULL OR NEW.provider = '' THEN
    NEW.provider := CASE
      WHEN NEW.secret_name LIKE 'BITRIX24_%'           THEN 'bitrix24'
      WHEN NEW.secret_name LIKE 'N8N_%'                THEN 'n8n'
      WHEN NEW.secret_name LIKE 'GITHUB_%'             THEN 'github'
      WHEN NEW.secret_name LIKE 'EXTERNAL_PROMOBRIND_%'THEN 'promobrind'
      WHEN NEW.secret_name LIKE 'EXTERNAL_CRM_%'       THEN 'crm'
      WHEN NEW.secret_name LIKE 'MCP_%'                THEN 'mcp'
      WHEN NEW.secret_name LIKE 'INBOUND_WEBHOOK_HMAC_%' THEN 'webhook'
      WHEN NEW.secret_name LIKE 'OUTBOUND_WEBHOOK_SECRET_%' THEN 'webhook'
      ELSE 'other'
    END;
  END IF;

  -- Computar length e masked_suffix a partir do secret_value
  IF NEW.secret_value IS NOT NULL THEN
    NEW.length := length(NEW.secret_value);
    NEW.masked_suffix := CASE
      WHEN length(NEW.secret_value) >= 4 THEN right(NEW.secret_value, 4)
      ELSE NEW.secret_value
    END;
  END IF;

  -- Manter updated_at em sincronia
  NEW.updated_at := now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_integration_credentials_derive_biu ON public.integration_credentials;
CREATE TRIGGER tg_integration_credentials_derive_biu
  BEFORE INSERT OR UPDATE ON public.integration_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_integration_credentials_derive();

-- ============================================================
-- 3) secret_rotation_log: criar tabela de auditoria de rotação
-- ============================================================
CREATE TABLE IF NOT EXISTS public.secret_rotation_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_name     text NOT NULL,
  rotated_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  previous_suffix text,
  new_suffix      text,
  notes           text,
  action_type     text NOT NULL CHECK (action_type IN ('set','rotate')),
  rotated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_secret_rotation_log_secret_name
  ON public.secret_rotation_log (secret_name, rotated_at DESC);
CREATE INDEX IF NOT EXISTS ix_secret_rotation_log_rotated_at
  ON public.secret_rotation_log (rotated_at DESC);
CREATE INDEX IF NOT EXISTS ix_secret_rotation_log_rotated_by
  ON public.secret_rotation_log (rotated_by);

-- RLS: dev-only (mesmo padrão de integration_credentials)
ALTER TABLE public.secret_rotation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS secret_rotation_log_dev_select ON public.secret_rotation_log;
CREATE POLICY secret_rotation_log_dev_select
  ON public.secret_rotation_log
  FOR SELECT
  USING (public.is_dev());

DROP POLICY IF EXISTS secret_rotation_log_service_insert ON public.secret_rotation_log;
CREATE POLICY secret_rotation_log_service_insert
  ON public.secret_rotation_log
  FOR INSERT
  WITH CHECK (false); -- só service_role; bloqueia clientes anon/authenticated

GRANT SELECT ON public.secret_rotation_log TO authenticated;

-- ============================================================
-- 4) Documentação inline
-- ============================================================
COMMENT ON COLUMN public.integration_credentials.masked_suffix IS
  'Últimos 4 caracteres do secret_value (preenchido por trigger BIU). UI exibe sem revelar valor.';
COMMENT ON COLUMN public.integration_credentials.length IS
  'Tamanho do secret_value em caracteres (preenchido por trigger BIU). UI exibe sem revelar valor.';
COMMENT ON COLUMN public.integration_credentials.notes IS
  'Anotação livre sobre a credencial (substitui description; ambos coexistem).';
COMMENT ON COLUMN public.integration_credentials.updated_by IS
  'Última pessoa (uuid) que rotacionou/definiu este secret via /admin/conexoes.';
COMMENT ON TABLE public.secret_rotation_log IS
  'Auditoria de set/rotate de secrets. Lookup via secrets-manager.action=rotation_history.';
