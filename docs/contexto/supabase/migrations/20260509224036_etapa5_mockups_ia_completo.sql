-- ============================================================
-- Etapa 5: Mockups + IA (7 tabelas + triggers + seeds)
-- 
-- Schema oficial extraído de migrations/20250103_mockup_ai_complete.sql
-- Adaptações:
--   - bitrix_clients FK removida (tabela não existe)
--   - Policies usam gates RBAC (is_admin) em vez de profiles.role='admin'
--   - Trigger create_mockup_credit_account em auth.users SUBSTITUÍDO por backfill
--   - Policy "System can update credits USING(true)" restrita (sem policy → service_role)
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- 1) personalization_techniques — catálogo de técnicas
-- ════════════════════════════════════════════════════════════
CREATE TABLE public.personalization_techniques (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  code                 text NOT NULL UNIQUE,
  description          text,
  prompt_suffix        text NOT NULL,
  requires_color_count boolean DEFAULT false,
  base_cost_multiplier numeric(4,2) DEFAULT 1.0,
  is_active            boolean DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.personalization_techniques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pt_select_active_or_admin"
  ON public.personalization_techniques FOR SELECT TO authenticated
  USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "pt_admin_manage"
  ON public.personalization_techniques FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ════════════════════════════════════════════════════════════
-- 2) mockup_generation_jobs — jobs de geração
-- ════════════════════════════════════════════════════════════
CREATE TABLE public.mockup_generation_jobs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id                uuid,  -- FK pra bitrix_clients removida (drift documentado)
  product_id               uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name             text NOT NULL,
  product_sku              text,
  technique_id             uuid REFERENCES public.personalization_techniques(id) ON DELETE SET NULL,
  technique_name           text NOT NULL,
  logo_url                 text NOT NULL,
  logo_filename            text,
  product_colors           jsonb NOT NULL DEFAULT '[]'::jsonb,
  colors_count             integer NOT NULL DEFAULT 1,
  areas_config             jsonb NOT NULL DEFAULT '[]'::jsonb,
  art_colors_count         integer DEFAULT 1,
  custom_prompt            text,
  ai_model                 text DEFAULT 'pro',
  status                   text NOT NULL DEFAULT 'pending',
  total_mockups            integer NOT NULL DEFAULT 0,
  completed_mockups        integer DEFAULT 0,
  failed_mockups           integer DEFAULT 0,
  estimated_cost           numeric(10,2),
  actual_cost              numeric(10,2),
  error_message            text,
  processing_started_at    timestamptz,
  processing_completed_at  timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  CONSTRAINT valid_ai_model CHECK (ai_model IN ('standard','pro'))
);
CREATE INDEX idx_mockup_jobs_user_id     ON public.mockup_generation_jobs(user_id);
CREATE INDEX idx_mockup_jobs_client_id   ON public.mockup_generation_jobs(client_id);
CREATE INDEX idx_mockup_jobs_status      ON public.mockup_generation_jobs(status);
CREATE INDEX idx_mockup_jobs_created_at  ON public.mockup_generation_jobs(created_at DESC);

ALTER TABLE public.mockup_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mgj_select_own_or_admin"
  ON public.mockup_generation_jobs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "mgj_insert_self"
  ON public.mockup_generation_jobs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "mgj_update_own_or_admin"
  ON public.mockup_generation_jobs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "mgj_delete_admin"
  ON public.mockup_generation_jobs FOR DELETE TO authenticated
  USING (public.is_admin_strict(auth.uid()));

COMMENT ON COLUMN public.mockup_generation_jobs.client_id IS
  'FK pra bitrix_clients removida na Etapa 5 — tabela não existe ainda. Quando bitrix_clients for criada, adicionar REFERENCES.';

-- ════════════════════════════════════════════════════════════
-- 3) generated_mockups — mockups gerados
-- ════════════════════════════════════════════════════════════
CREATE TABLE public.generated_mockups (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                   uuid NOT NULL REFERENCES public.mockup_generation_jobs(id) ON DELETE CASCADE,
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id               uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name             text NOT NULL,
  product_sku              text,
  technique_id             uuid REFERENCES public.personalization_techniques(id) ON DELETE SET NULL,
  technique_name           text NOT NULL,
  product_color_hex        text NOT NULL,
  product_color_name       text,
  area_name                text NOT NULL,
  area_config              jsonb NOT NULL,
  mockup_url               text NOT NULL,
  logo_url                 text NOT NULL,
  thumbnail_url            text,
  ai_model_used            text NOT NULL,
  generation_time_seconds  integer,
  prompt_used              text,
  seed_used                integer,
  quality_score            numeric(3,2),
  has_errors               boolean DEFAULT false,
  error_details            text,
  approval_status          text DEFAULT 'pending',
  approved_by_user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at              timestamptz,
  client_feedback          text,
  generation_cost          numeric(10,4),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_approval_status CHECK (
    approval_status IN ('pending','approved_internal','approved_client','rejected')
  )
);
CREATE INDEX idx_generated_mockups_job_id          ON public.generated_mockups(job_id);
CREATE INDEX idx_generated_mockups_user_id         ON public.generated_mockups(user_id);
CREATE INDEX idx_generated_mockups_approval_status ON public.generated_mockups(approval_status);
CREATE INDEX idx_generated_mockups_created_at      ON public.generated_mockups(created_at DESC);

ALTER TABLE public.generated_mockups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gm_select_own_or_admin"
  ON public.generated_mockups FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "gm_insert_self"
  ON public.generated_mockups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gm_update_own_or_admin"
  ON public.generated_mockups FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "gm_delete_own_or_admin"
  ON public.generated_mockups FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ════════════════════════════════════════════════════════════
-- 4) mockup_approval_links — links públicos de aprovação cliente
-- ════════════════════════════════════════════════════════════
CREATE TABLE public.mockup_approval_links (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id              uuid NOT NULL REFERENCES public.mockup_generation_jobs(id) ON DELETE CASCADE,
  client_id           uuid,  -- FK bitrix_clients removida
  public_token        text NOT NULL UNIQUE,
  expires_at          timestamptz,
  max_uses            integer,
  current_uses        integer DEFAULT 0,
  is_active           boolean DEFAULT true,
  first_accessed_at   timestamptz,
  last_accessed_at    timestamptz,
  access_count        integer DEFAULT 0,
  approved_at         timestamptz,
  rejected_at         timestamptz,
  client_notes        text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_approval_links_token   ON public.mockup_approval_links(public_token);
CREATE INDEX idx_approval_links_job_id  ON public.mockup_approval_links(job_id);
CREATE INDEX idx_approval_links_active  ON public.mockup_approval_links(is_active, public_token);

ALTER TABLE public.mockup_approval_links ENABLE ROW LEVEL SECURITY;

-- Acesso público VIA TOKEN (cliente externo não logado): permitido SELECT em links ativos
CREATE POLICY "mal_public_select_active"
  ON public.mockup_approval_links FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "mal_authenticated_select"
  ON public.mockup_approval_links FOR SELECT TO authenticated
  USING (
    is_active = true 
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.mockup_generation_jobs j
      WHERE j.id = mockup_approval_links.job_id AND j.user_id = auth.uid()
    )
  );

CREATE POLICY "mal_insert_own_jobs"
  ON public.mockup_approval_links FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mockup_generation_jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

CREATE POLICY "mal_update_own_or_admin"
  ON public.mockup_approval_links FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.mockup_generation_jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

CREATE POLICY "mal_delete_admin"
  ON public.mockup_approval_links FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Cliente externo (anon) precisa registrar aprovação/rejeição via UPDATE — política permite via token na app
-- (deixar pra edge function fazer com service_role)

-- ════════════════════════════════════════════════════════════
-- 5) mockup_credits — saldo por usuário
-- ════════════════════════════════════════════════════════════
CREATE TABLE public.mockup_credits (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance               numeric(10,2) NOT NULL DEFAULT 0.00,
  lifetime_earned       numeric(10,2) NOT NULL DEFAULT 0.00,
  lifetime_spent        numeric(10,2) NOT NULL DEFAULT 0.00,
  monthly_limit         numeric(10,2),
  daily_limit           numeric(10,2),
  current_month_spent   numeric(10,2) DEFAULT 0.00,
  current_day_spent     numeric(10,2) DEFAULT 0.00,
  last_reset_month      date,
  last_reset_day        date,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT positive_balance CHECK (balance >= 0)
);
CREATE INDEX idx_mockup_credits_user_id ON public.mockup_credits(user_id);

ALTER TABLE public.mockup_credits ENABLE ROW LEVEL SECURITY;

-- Vendedor lê o próprio saldo, supervisor+ vê todos
CREATE POLICY "mc_select_own_or_supervisor"
  ON public.mockup_credits FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_supervisor_or_above(auth.uid()));

-- Admin pode CRUD completo (conceder créditos, ajustar limites)
CREATE POLICY "mc_admin_manage"
  ON public.mockup_credits FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- INSERT/UPDATE pra non-admin: SEM policy → service_role apenas (edge functions debitam saldo via triggers)

-- ════════════════════════════════════════════════════════════
-- 6) mockup_credit_transactions — log de transações
-- ════════════════════════════════════════════════════════════
CREATE TABLE public.mockup_credit_transactions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_account_id   uuid NOT NULL REFERENCES public.mockup_credits(id) ON DELETE CASCADE,
  type                text NOT NULL,
  amount              numeric(10,4) NOT NULL,
  balance_before      numeric(10,2) NOT NULL,
  balance_after       numeric(10,2) NOT NULL,
  mockup_id           uuid REFERENCES public.generated_mockups(id) ON DELETE SET NULL,
  job_id              uuid REFERENCES public.mockup_generation_jobs(id) ON DELETE SET NULL,
  description         text,
  metadata            jsonb DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_transaction_type CHECK (type IN ('charge','refund','grant','bonus','purchase'))
);
CREATE INDEX idx_credit_transactions_user_id    ON public.mockup_credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON public.mockup_credit_transactions(created_at DESC);

ALTER TABLE public.mockup_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mct_select_own_or_supervisor"
  ON public.mockup_credit_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_supervisor_or_above(auth.uid()));
-- INSERT/UPDATE/DELETE: service_role apenas (triggers)

-- ════════════════════════════════════════════════════════════
-- 7) mockup_templates — templates por produto
-- ════════════════════════════════════════════════════════════
CREATE TABLE public.mockup_templates (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id             uuid REFERENCES public.products(id) ON DELETE CASCADE,
  name                   text NOT NULL,
  description            text,
  template_image_url     text NOT NULL,
  predefined_areas       jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_technique_id   uuid REFERENCES public.personalization_techniques(id) ON DELETE SET NULL,
  available_colors       jsonb DEFAULT '[]'::jsonb,
  usage_count            integer DEFAULT 0,
  is_featured            boolean DEFAULT false,
  is_active              boolean DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mockup_templates_product_id ON public.mockup_templates(product_id);
CREATE INDEX idx_mockup_templates_active     ON public.mockup_templates(is_active, is_featured);

ALTER TABLE public.mockup_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_select_active_or_admin"
  ON public.mockup_templates FOR SELECT TO authenticated
  USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "mt_admin_manage"
  ON public.mockup_templates FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ════════════════════════════════════════════════════════════
-- TRIGGERS updated_at em todas as tabelas
-- (reutilizando fn_set_updated_at já existente da Etapa 3B)
-- ════════════════════════════════════════════════════════════
CREATE TRIGGER trg_pt_updated_at  BEFORE UPDATE ON public.personalization_techniques
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_mgj_updated_at BEFORE UPDATE ON public.mockup_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_gm_updated_at  BEFORE UPDATE ON public.generated_mockups
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_mal_updated_at BEFORE UPDATE ON public.mockup_approval_links
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_mc_updated_at  BEFORE UPDATE ON public.mockup_credits
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_mt_updated_at  BEFORE UPDATE ON public.mockup_templates
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ════════════════════════════════════════════════════════════
-- FUNÇÃO: Calcular custo estimado de job (BEFORE INSERT/UPDATE)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.calculate_mockup_job_estimated_cost()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  base_cost       numeric(10,4);
  color_count     integer;
  area_count      integer;
  tech_multiplier numeric(4,2);
BEGIN
  IF NEW.ai_model = 'pro' THEN base_cost := 0.60;
  ELSE base_cost := 0.10;
  END IF;
  
  color_count := jsonb_array_length(NEW.product_colors);
  area_count  := jsonb_array_length(NEW.areas_config);
  
  SELECT COALESCE(base_cost_multiplier, 1.0) INTO tech_multiplier
  FROM public.personalization_techniques WHERE id = NEW.technique_id;
  
  NEW.total_mockups   := color_count * area_count;
  NEW.estimated_cost  := base_cost * color_count * area_count * COALESCE(tech_multiplier, 1.0);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_mgj_calculate_cost
  BEFORE INSERT OR UPDATE OF product_colors, areas_config, ai_model, technique_id
  ON public.mockup_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.calculate_mockup_job_estimated_cost();

-- ════════════════════════════════════════════════════════════
-- FUNÇÃO: Debitar créditos quando job → 'processing'
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.charge_mockup_credits_for_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_balance   numeric(10,2);
  v_credit_id uuid;
BEGIN
  IF NEW.status = 'processing' AND (OLD.status IS NULL OR OLD.status != 'processing') THEN
    SELECT id, balance INTO v_credit_id, v_balance
    FROM public.mockup_credits
    WHERE user_id = NEW.user_id
    FOR UPDATE;
    
    IF v_credit_id IS NULL THEN
      RAISE EXCEPTION 'Conta de créditos não encontrada pro user %', NEW.user_id;
    END IF;
    
    IF v_balance < NEW.estimated_cost THEN
      RAISE EXCEPTION 'Saldo insuficiente: necessário R$ %, disponível R$ %', 
        NEW.estimated_cost, v_balance;
    END IF;
    
    UPDATE public.mockup_credits SET 
      balance             = balance - NEW.estimated_cost,
      lifetime_spent      = lifetime_spent + NEW.estimated_cost,
      current_month_spent = current_month_spent + NEW.estimated_cost,
      current_day_spent   = current_day_spent + NEW.estimated_cost
    WHERE user_id = NEW.user_id;
    
    INSERT INTO public.mockup_credit_transactions (
      user_id, credit_account_id, type, amount, balance_before, balance_after, job_id, description
    ) VALUES (
      NEW.user_id, v_credit_id, 'charge', NEW.estimated_cost, v_balance, 
      v_balance - NEW.estimated_cost, NEW.id, 
      format('Geração de %s mockups - Job %s', NEW.total_mockups, NEW.id)
    );
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_mgj_charge_credits
  AFTER INSERT OR UPDATE OF status ON public.mockup_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.charge_mockup_credits_for_job();

-- ════════════════════════════════════════════════════════════
-- FUNÇÃO: Atualizar progresso de job ao inserir mockup
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_mockup_job_progress()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.mockup_generation_jobs
  SET 
    completed_mockups        = completed_mockups + 1,
    status                   = CASE WHEN (completed_mockups + 1) >= total_mockups THEN 'completed' ELSE 'processing' END,
    processing_completed_at  = CASE WHEN (completed_mockups + 1) >= total_mockups THEN now() ELSE processing_completed_at END
  WHERE id = NEW.job_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_gm_update_job_progress
  AFTER INSERT ON public.generated_mockups
  FOR EACH ROW EXECUTE FUNCTION public.update_mockup_job_progress();

-- ════════════════════════════════════════════════════════════
-- FUNÇÃO: Gerar token de aprovação único (BEFORE INSERT)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.generate_mockup_approval_token()
RETURNS text LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  v_token text;
  v_exists boolean;
BEGIN
  LOOP
    v_token := encode(gen_random_bytes(24), 'base64');
    v_token := replace(replace(replace(v_token, '/', ''), '+', ''), '=', '');
    v_token := substring(v_token, 1, 32);
    SELECT EXISTS(SELECT 1 FROM public.mockup_approval_links WHERE public_token = v_token) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_token;
END $$;

CREATE OR REPLACE FUNCTION public.set_mockup_approval_token()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.public_token IS NULL OR NEW.public_token = '' THEN
    NEW.public_token := public.generate_mockup_approval_token();
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_mal_set_token
  BEFORE INSERT ON public.mockup_approval_links
  FOR EACH ROW EXECUTE FUNCTION public.set_mockup_approval_token();

-- ════════════════════════════════════════════════════════════
-- FUNÇÃO: Reset mensal/diário de contadores (chamada via cron/edge)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.reset_mockup_credit_limits()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.mockup_credits SET 
    current_month_spent = 0.00,
    last_reset_month    = CURRENT_DATE
  WHERE last_reset_month IS NULL OR last_reset_month < date_trunc('month', CURRENT_DATE)::date;
  
  UPDATE public.mockup_credits SET 
    current_day_spent = 0.00,
    last_reset_day    = CURRENT_DATE
  WHERE last_reset_day IS NULL OR last_reset_day < CURRENT_DATE;
END $$;
GRANT EXECUTE ON FUNCTION public.reset_mockup_credit_limits() TO service_role;

-- ════════════════════════════════════════════════════════════
-- FUNÇÃO: Incrementar contador de uso de template
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.increment_mockup_template_usage()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.mockup_templates SET usage_count = usage_count + 1
    WHERE product_id = NEW.product_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_mgj_increment_template_usage
  AFTER INSERT ON public.mockup_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.increment_mockup_template_usage();

-- ════════════════════════════════════════════════════════════
-- SEEDS: 11 técnicas de personalização
-- ════════════════════════════════════════════════════════════
INSERT INTO public.personalization_techniques (name, code, prompt_suffix, requires_color_count) VALUES
('Bordado',       'bordado',     'as professional machine embroidery with visible thread stitching texture, showing the thread weave pattern typical of embroidered logos', true),
('Silk Screen',   'silk',        'as screen printed with flat solid colors, matte finish, ink sitting on top of the fabric surface', true),
('DTF',           'dtf',         'as DTF (Direct to Film) printed transfer with vibrant colors, slight glossy finish, smooth edges', false),
('Laser CO2',     'laser_co2',   'as CO2 laser engraved with precise etching, showing material removal and light burn marks on organic materials', false),
('Laser Fibra',   'laser_fibra', 'as fiber laser marked on metal, creating a high-contrast permanent mark with polished appearance', false),
('Sublimação',    'sublimacao',  'as sublimation printed, colors absorbed into the material, seamless integration with no texture difference', false),
('Tampografia',   'tampografia', 'as pad printed with slightly glossy ink, precise small details, subtle ink buildup', false),
('Hot Stamping',  'hot_stamping','as hot stamped with metallic foil finish, shiny reflective surface, typically gold or silver', false),
('Adesivo',       'adesivo',     'as vinyl sticker/decal applied to surface, slight edge visibility, glossy or matte vinyl finish', false),
('UV',            'uv',          'as UV printed with raised ink texture, vibrant colors, slightly embossed feel', false),
('Transfer',      'transfer',    'as heat transfer vinyl, smooth finish with slight sheen, cut around the design edges', false);

-- ════════════════════════════════════════════════════════════
-- BACKFILL: Criar conta de créditos pra cada user existente (R$ 10 bônus)
-- ════════════════════════════════════════════════════════════
INSERT INTO public.mockup_credits (user_id, balance, lifetime_earned)
SELECT id, 10.00, 10.00
FROM auth.users
WHERE email IN (
  'adm01@promobrindes.com.br',
  'ti@promobrindes.com.br',
  'comercial03@promobrindes.com.br',
  'comercial05@promobrindes.com.br'
)
ON CONFLICT (user_id) DO NOTHING;

-- Registrar transação de bônus pra cada
INSERT INTO public.mockup_credit_transactions (
  user_id, credit_account_id, type, amount, balance_before, balance_after, description
)
SELECT 
  c.user_id, c.id, 'bonus', 10.00, 0.00, 10.00, 'Bônus inicial Etapa 5'
FROM public.mockup_credits c
JOIN auth.users u ON u.id = c.user_id
WHERE u.email IN (
  'adm01@promobrindes.com.br',
  'ti@promobrindes.com.br',
  'comercial03@promobrindes.com.br',
  'comercial05@promobrindes.com.br'
);
