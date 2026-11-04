-- ============================================================
-- AI Router — Multi-provider architecture (PR 1/6)
-- Cria 5 tabelas: providers, models, function_routing, provider_quotas, routing_decisions
-- ============================================================

-- ---------------------------------------------------------------
-- 1) ai_providers — cadastro de providers de IA
-- ---------------------------------------------------------------
CREATE TABLE public.ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  display_name text NOT NULL,
  api_base_url text NOT NULL,
  api_format text NOT NULL CHECK (api_format IN ('openai_compatible', 'anthropic_native', 'google_native', 'custom')),
  auth_header text NOT NULL DEFAULT 'Authorization',
  auth_format text NOT NULL DEFAULT 'Bearer {key}',
  secret_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 100,
  timeout_ms int NOT NULL DEFAULT 30000 CHECK (timeout_ms BETWEEN 1000 AND 120000),
  max_retries int NOT NULL DEFAULT 2 CHECK (max_retries BETWEEN 0 AND 5),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_test_at timestamptz,
  last_test_ok boolean,
  last_test_message text,
  last_latency_ms int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);
COMMENT ON TABLE public.ai_providers IS 'AI provider catalog (Lovable, OpenAI, Anthropic, Google, DeepSeek, custom). Managed via /admin/conexoes.';
COMMENT ON COLUMN public.ai_providers.secret_name IS 'Name of the credential in Vault/integration_credentials (e.g. LOVABLE_API_KEY).';
COMMENT ON COLUMN public.ai_providers.auth_format IS 'Template for the auth header value. Use {key} as placeholder. Example: "Bearer {key}" or just "{key}".';
COMMENT ON COLUMN public.ai_providers.priority IS 'Global ordering hint (lower = higher priority) for cost-aware routing tiebreakers.';

CREATE INDEX idx_ai_providers_active ON public.ai_providers(is_active) WHERE is_active = true;
CREATE INDEX idx_ai_providers_slug ON public.ai_providers(slug);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_ai_providers_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER ai_providers_updated_at
BEFORE UPDATE ON public.ai_providers
FOR EACH ROW EXECUTE FUNCTION public.tg_ai_providers_set_updated_at();

-- ---------------------------------------------------------------
-- 2) ai_models — modelos por provider, com pricing editável
-- ---------------------------------------------------------------
CREATE TABLE public.ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  model_id text NOT NULL,
  display_name text NOT NULL,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  cost_input_per_1m numeric(10,4) NOT NULL DEFAULT 0 CHECK (cost_input_per_1m >= 0),
  cost_output_per_1m numeric(10,4) NOT NULL DEFAULT 0 CHECK (cost_output_per_1m >= 0),
  cost_per_image numeric(10,4) NOT NULL DEFAULT 0 CHECK (cost_per_image >= 0),
  max_input_tokens int CHECK (max_input_tokens IS NULL OR max_input_tokens > 0),
  max_output_tokens int CHECK (max_output_tokens IS NULL OR max_output_tokens > 0),
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_id, model_id)
);
COMMENT ON TABLE public.ai_models IS 'Models offered by each provider. capabilities JSON: {chat,vision_in,image_out,streaming,tools,json_mode,reasoning,multilingual}. Costs in USD/1M tokens (editable).';
COMMENT ON COLUMN public.ai_models.capabilities IS 'JSON flags. Required keys: chat (bool). Optional: vision_in, image_out, streaming, tools, json_mode, reasoning, multilingual.';

CREATE INDEX idx_ai_models_provider ON public.ai_models(provider_id);
CREATE INDEX idx_ai_models_active ON public.ai_models(is_active) WHERE is_active = true;
CREATE INDEX idx_ai_models_capabilities ON public.ai_models USING gin(capabilities);

CREATE TRIGGER ai_models_updated_at
BEFORE UPDATE ON public.ai_models
FOR EACH ROW EXECUTE FUNCTION public.tg_ai_providers_set_updated_at();

-- ---------------------------------------------------------------
-- 3) ai_function_routing — função → modelo principal + fallbacks
-- ---------------------------------------------------------------
CREATE TABLE public.ai_function_routing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text UNIQUE NOT NULL,
  primary_model_id uuid NOT NULL REFERENCES public.ai_models(id) ON DELETE RESTRICT,
  fallback_model_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  required_capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
COMMENT ON TABLE public.ai_function_routing IS 'Function → model routing. The primary is tried first, then fallbacks in order. required_capabilities filters out invalid fallbacks at runtime.';
COMMENT ON COLUMN public.ai_function_routing.required_capabilities IS 'JSON of mandatory capabilities. Example: {"image_out": true} blocks any model whose capabilities.image_out != true from being used.';
COMMENT ON COLUMN public.ai_function_routing.request_overrides IS 'JSON merged on top of caller-supplied request body. Example: {"temperature": 0.2, "max_tokens": 2000}.';

CREATE INDEX idx_ai_function_routing_active ON public.ai_function_routing(is_active) WHERE is_active = true;
CREATE INDEX idx_ai_function_routing_primary ON public.ai_function_routing(primary_model_id);

CREATE TRIGGER ai_function_routing_updated_at
BEFORE UPDATE ON public.ai_function_routing
FOR EACH ROW EXECUTE FUNCTION public.tg_ai_providers_set_updated_at();

-- ---------------------------------------------------------------
-- 4) ai_provider_quotas — teto mensal por provider (resposta #3 do plano)
-- ---------------------------------------------------------------
CREATE TABLE public.ai_provider_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
  monthly_limit_usd numeric(10,2) CHECK (monthly_limit_usd IS NULL OR monthly_limit_usd > 0),
  monthly_limit_tokens bigint CHECK (monthly_limit_tokens IS NULL OR monthly_limit_tokens > 0),
  alert_threshold_pct int NOT NULL DEFAULT 80 CHECK (alert_threshold_pct BETWEEN 1 AND 100),
  hard_stop boolean NOT NULL DEFAULT true,
  current_period_start date NOT NULL DEFAULT date_trunc('month', now())::date,
  current_period_usage_usd numeric(12,4) NOT NULL DEFAULT 0 CHECK (current_period_usage_usd >= 0),
  current_period_usage_tokens bigint NOT NULL DEFAULT 0 CHECK (current_period_usage_tokens >= 0),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_id, current_period_start)
);
COMMENT ON TABLE public.ai_provider_quotas IS 'Monthly spend/token cap per provider. NULL limit = unlimited. hard_stop=true blocks routing when limit reached.';

CREATE INDEX idx_ai_provider_quotas_period ON public.ai_provider_quotas(provider_id, current_period_start);

CREATE TRIGGER ai_provider_quotas_updated_at
BEFORE UPDATE ON public.ai_provider_quotas
FOR EACH ROW EXECUTE FUNCTION public.tg_ai_providers_set_updated_at();

-- ---------------------------------------------------------------
-- 5) ai_routing_decisions — log de observabilidade do router
-- ---------------------------------------------------------------
CREATE TABLE public.ai_routing_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  attempted_models uuid[] NOT NULL,
  attempted_providers uuid[] NOT NULL,
  attempted_outcomes jsonb NOT NULL DEFAULT '[]'::jsonb,
  final_model_id uuid REFERENCES public.ai_models(id),
  final_provider_id uuid REFERENCES public.ai_providers(id),
  total_attempts int NOT NULL,
  total_duration_ms int NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('success', 'all_failed', 'fallback_used', 'quota_blocked', 'no_routing')),
  usage_log_id uuid,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ai_routing_decisions IS 'Per-call audit of router decisions. attempted_outcomes is an array of {model_id, status, error_kind, latency_ms} mirroring attempted_models order.';

CREATE INDEX idx_ai_routing_decisions_function ON public.ai_routing_decisions(function_name, created_at DESC);
CREATE INDEX idx_ai_routing_decisions_user ON public.ai_routing_decisions(user_id, created_at DESC);
CREATE INDEX idx_ai_routing_decisions_outcome ON public.ai_routing_decisions(outcome, created_at DESC) WHERE outcome != 'success';

-- ---------------------------------------------------------------
-- RLS — todas as tabelas são dev-only para CRUD; service-role lê/escreve
-- ---------------------------------------------------------------
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_function_routing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_routing_decisions ENABLE ROW LEVEL SECURITY;

-- Helper: is_dev() já existe no projeto. Vou usar em todas as policies.

-- ai_providers: dev manage, autenticados podem ler nome+slug (read-only para UI mostrar opções)
CREATE POLICY "ai_providers_dev_all"
  ON public.ai_providers FOR ALL
  USING (public.is_dev())
  WITH CHECK (public.is_dev());

-- ai_models: dev manage, autenticados podem ler para popular dropdowns
CREATE POLICY "ai_models_dev_all"
  ON public.ai_models FOR ALL
  USING (public.is_dev())
  WITH CHECK (public.is_dev());

-- ai_function_routing: dev manage exclusivo (afeta produção)
CREATE POLICY "ai_function_routing_dev_all"
  ON public.ai_function_routing FOR ALL
  USING (public.is_dev())
  WITH CHECK (public.is_dev());

-- ai_provider_quotas: dev manage exclusivo
CREATE POLICY "ai_provider_quotas_dev_all"
  ON public.ai_provider_quotas FOR ALL
  USING (public.is_dev())
  WITH CHECK (public.is_dev());

-- ai_routing_decisions: dev/admin podem ler (auditoria), insert apenas via service_role
CREATE POLICY "ai_routing_decisions_dev_read"
  ON public.ai_routing_decisions FOR SELECT
  USING (public.is_dev() OR public.has_role(auth.uid(), 'supervisor'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- (insert via service_role bypassa RLS, sem policy adicional necessária)

-- ---------------------------------------------------------------
-- VIEW agregada: routing efetivo (resolve refs e mostra capabilities)
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_ai_function_routing_effective AS
SELECT
  r.id AS routing_id,
  r.function_name,
  r.is_active,
  r.required_capabilities,
  r.request_overrides,
  r.notes,
  -- Primary
  pm.id AS primary_model_id,
  pm.model_id AS primary_model,
  pm.display_name AS primary_display_name,
  pm.capabilities AS primary_capabilities,
  pm.cost_input_per_1m AS primary_cost_input,
  pm.cost_output_per_1m AS primary_cost_output,
  pm.is_active AS primary_active,
  pp.id AS primary_provider_id,
  pp.slug AS primary_provider_slug,
  pp.is_active AS primary_provider_active,
  -- Fallbacks (jsonb array com mesma estrutura)
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
        'model_id', fm.id,
        'model', fm.model_id,
        'display_name', fm.display_name,
        'provider_slug', fp.slug,
        'capabilities', fm.capabilities,
        'cost_input', fm.cost_input_per_1m,
        'cost_output', fm.cost_output_per_1m,
        'model_active', fm.is_active,
        'provider_active', fp.is_active,
        'order_index', ord.idx
      ) ORDER BY ord.idx)
     FROM unnest(r.fallback_model_ids) WITH ORDINALITY AS ord(model_id, idx)
     JOIN public.ai_models fm ON fm.id = ord.model_id
     JOIN public.ai_providers fp ON fp.id = fm.provider_id),
    '[]'::jsonb
  ) AS fallbacks,
  r.updated_at,
  r.updated_by
FROM public.ai_function_routing r
JOIN public.ai_models pm ON pm.id = r.primary_model_id
JOIN public.ai_providers pp ON pp.id = pm.provider_id;

COMMENT ON VIEW public.v_ai_function_routing_effective IS 'Resolved routing per function: primary expanded inline + fallbacks as jsonb array. Used by router and admin UI.';

-- Grant para roles autenticados (somente dev verá via RLS subjacente)
GRANT SELECT ON public.v_ai_function_routing_effective TO authenticated, service_role;

-- ---------------------------------------------------------------
-- FUNÇÃO RPC: register_ai_routing_decision (server-side log helper)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_ai_routing_decision(
  p_function_name text,
  p_user_id uuid,
  p_attempted_models uuid[],
  p_attempted_providers uuid[],
  p_attempted_outcomes jsonb,
  p_final_model_id uuid,
  p_final_provider_id uuid,
  p_total_attempts int,
  p_total_duration_ms int,
  p_outcome text,
  p_usage_log_id uuid DEFAULT NULL,
  p_request_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.ai_routing_decisions (
    function_name, user_id, attempted_models, attempted_providers, attempted_outcomes,
    final_model_id, final_provider_id, total_attempts, total_duration_ms, outcome,
    usage_log_id, request_id
  ) VALUES (
    p_function_name, p_user_id, p_attempted_models, p_attempted_providers, p_attempted_outcomes,
    p_final_model_id, p_final_provider_id, p_total_attempts, p_total_duration_ms, p_outcome,
    p_usage_log_id, p_request_id
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.register_ai_routing_decision IS 'Server-side helper for the AI router to log decisions. Used by service_role from edge functions.';

REVOKE ALL ON FUNCTION public.register_ai_routing_decision FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_ai_routing_decision TO service_role;
