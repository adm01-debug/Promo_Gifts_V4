-- ============================================================
-- AI Usage — alinhamento de schema com o código
--
-- Estado anterior: ai_usage_logs e ai_usage_quotas existiam com schema
-- incompatível com `_shared/ai-usage.ts` e `useAiUsage.ts`. Como ambas
-- estavam VAZIAS (0 registros) e nada externo as referencia via FK,
-- recriamos com o schema esperado pelo código (frontend e edges).
--
-- Também criamos os RPCs que `_shared/ai-usage.ts` chama mas não existiam:
--   - check_ai_quota(_user_id)
--   - acquire_ai_quota(_user_id, _function_name, _model)
-- ============================================================

DROP TABLE IF EXISTS public.ai_usage_logs CASCADE;
DROP TABLE IF EXISTS public.ai_usage_quotas CASCADE;

-- ============================================================
-- ai_usage_logs — schema usado por _shared/ai-usage.ts e useAiUsage hook
-- ============================================================
CREATE TABLE public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  function_name text NOT NULL,
  model text,
  input_tokens int NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens int NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  total_tokens int GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  estimated_cost_usd numeric(12,6) NOT NULL DEFAULT 0 CHECK (estimated_cost_usd >= 0),
  duration_ms int CHECK (duration_ms IS NULL OR duration_ms >= 0),
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('pending','success','error')),
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_usage_logs IS 'Per-call AI usage events. Inserted as status=pending by acquire_ai_quota, then UPDATEd to success/error after the call completes. Read by useAiUsage hook for dashboards.';

CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_logs_function_name ON public.ai_usage_logs(function_name, created_at DESC);
-- Índice composto resolve "uso do user no mês" via WHERE user_id = X AND created_at >= start_of_month
CREATE INDEX idx_ai_usage_logs_user_created ON public.ai_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_ai_usage_logs_status_errors ON public.ai_usage_logs(status, created_at DESC) WHERE status != 'success';

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_logs_user_own"
  ON public.ai_usage_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "ai_usage_logs_admin_all"
  ON public.ai_usage_logs FOR SELECT
  USING (
    public.is_dev()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'supervisor'::app_role)
  );

-- ============================================================
-- ai_usage_quotas — schema usado por useAiQuotas hook
-- ============================================================
CREATE TABLE public.ai_usage_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL UNIQUE,
  monthly_limit int NOT NULL DEFAULT 1000 CHECK (monthly_limit >= 0),
  is_unlimited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_usage_quotas IS 'Per-role monthly AI request limits. Looked up by check_ai_quota using user primary role. Editable by admin/dev via UI.';

ALTER TABLE public.ai_usage_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_quotas_read_authenticated"
  ON public.ai_usage_quotas FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "ai_usage_quotas_admin_write"
  ON public.ai_usage_quotas FOR ALL
  USING (public.is_dev() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_dev() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_ai_usage_quotas_updated_at
  BEFORE UPDATE ON public.ai_usage_quotas
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

INSERT INTO public.ai_usage_quotas (role, monthly_limit, is_unlimited) VALUES
  ('dev',        0,    true),
  ('admin',      0,    true),
  ('supervisor', 5000, false),
  ('manager',    5000, false),
  ('agente',     1000, false);

-- ============================================================
-- Helper: pega o role de maior prioridade do user
-- ============================================================
CREATE OR REPLACE FUNCTION public._get_user_primary_role(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE v_role text;
BEGIN
  SELECT ur.role::text INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
  ORDER BY CASE ur.role::text
    WHEN 'dev' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'supervisor' THEN 3
    WHEN 'manager' THEN 4
    WHEN 'agente' THEN 5
    ELSE 99
  END
  LIMIT 1;
  RETURN COALESCE(v_role, 'agente');
END;
$$;

REVOKE ALL ON FUNCTION public._get_user_primary_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._get_user_primary_role(uuid) TO authenticated, service_role;

-- ============================================================
-- check_ai_quota — chamado pelo frontend (useAiQuotaStatus)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_ai_quota(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_limit int;
  v_unlimited boolean;
  v_used int;
BEGIN
  v_role := public._get_user_primary_role(_user_id);

  SELECT monthly_limit, is_unlimited INTO v_limit, v_unlimited
  FROM public.ai_usage_quotas WHERE role = v_role;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', true, 'used', 0, 'limit', -1, 'remaining', -1,
      'unlimited', true, 'reason', 'no_quota_for_role'
    );
  END IF;

  SELECT count(*)::int INTO v_used
  FROM public.ai_usage_logs
  WHERE user_id = _user_id
    AND created_at >= date_trunc('month', now())
    AND status != 'error';

  IF v_unlimited THEN
    RETURN jsonb_build_object(
      'allowed', true, 'used', v_used, 'limit', -1, 'remaining', -1, 'unlimited', true
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_used < v_limit,
    'used', v_used,
    'limit', v_limit,
    'remaining', greatest(0, v_limit - v_used),
    'unlimited', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_ai_quota(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_ai_quota(uuid) TO authenticated, service_role;

-- ============================================================
-- acquire_ai_quota — chamado por edges; verifica + reserva slot atomicamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.acquire_ai_quota(_user_id uuid, _function_name text, _model text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check jsonb;
  v_log_id uuid;
BEGIN
  v_check := public.check_ai_quota(_user_id);

  IF NOT (v_check->>'allowed')::boolean THEN
    RETURN v_check;
  END IF;

  INSERT INTO public.ai_usage_logs (user_id, function_name, model, status)
  VALUES (_user_id, _function_name, _model, 'pending')
  RETURNING id INTO v_log_id;

  RETURN v_check || jsonb_build_object('log_id', v_log_id);
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_ai_quota(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acquire_ai_quota(uuid, text, text) TO service_role;
