-- Reduced fixture generated from reviewed pg_catalog columns/checks.
-- No real data. Omits external business tables, remote jobs and full auth/discount chain.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE public.products (id uuid PRIMARY KEY, organization_id uuid, product_type text, is_active boolean DEFAULT true);
CREATE TABLE public.product_variants (id uuid PRIMARY KEY, product_id uuid REFERENCES products(id), is_active boolean DEFAULT true);
CREATE TABLE public.user_organizations (user_id uuid,organization_id uuid,created_at timestamptz DEFAULT now());
CREATE FUNCTION public.user_is_org_member(org uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT EXISTS(SELECT 1 FROM public.user_organizations WHERE user_id=auth.uid() AND organization_id=org) $$;
-- Fixture role helper: no user is coordinator; tests exercise seller scoping.
CREATE FUNCTION public.is_coord_or_above(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
CREATE FUNCTION public.is_org_owner_or_admin(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
CREATE TABLE public.quotes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  quote_number text NOT NULL,
  client_id uuid,
  client_name text NOT NULL,
  created_by uuid,
  assigned_to uuid,
  status text DEFAULT 'draft'::text,
  stage text DEFAULT 'elaboration'::text,
  priority text DEFAULT 'normal'::text,
  subtotal numeric(10,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  shipping_cost numeric(10,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  total numeric(10,2) DEFAULT 0,
  valid_until date,
  estimated_delivery_days integer,
  notes text,
  internal_notes text,
  payment_terms text,
  tags jsonb DEFAULT '[]'::jsonb,
  approval_token text,
  approved_at timestamp with time zone,
  approved_by_client_name text,
  client_feedback text,
  viewed_at timestamp with time zone,
  view_count integer DEFAULT 0,
  last_sent_at timestamp with time zone,
  converted_to_order_id uuid,
  converted_at timestamp with time zone,
  conversion_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  organization_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  discount_percent numeric(5,2) DEFAULT 0,
  negotiation_markup_percent numeric(5,2) DEFAULT 0,
  real_subtotal numeric(10,2) DEFAULT 0,
  real_discount_percent numeric(5,2) DEFAULT 0,
  version integer DEFAULT 1 NOT NULL,
  client_email text,
  client_phone text,
  client_company text,
  client_cnpj text,
  delivery_time text,
  shipping_type text,
  bitrix_deal_id text,
  bitrix_quote_id text,
  synced_to_bitrix boolean DEFAULT false NOT NULL,
  synced_at timestamp with time zone,
  client_response text,
  client_response_at timestamp with time zone,
  client_response_notes text,
  shipping_method text,
  parent_quote_id uuid,
  is_latest_version boolean DEFAULT true NOT NULL,
  payment_method text,
  sent_at timestamp with time zone,
  contact_id uuid,
  discount_approval_status text,
  discount_approved_at timestamp with time zone,
  PRIMARY KEY(id)
);
ALTER TABLE public.quotes ADD CONSTRAINT chk_quotes_discount_approval_status CHECK (((discount_approval_status IS NULL) OR (discount_approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'expired'::text]))));
ALTER TABLE public.quotes ADD CONSTRAINT valid_discount_amount_nonnegative CHECK (((discount_amount IS NULL) OR (discount_amount >= (0)::numeric)));
ALTER TABLE public.quotes ADD CONSTRAINT valid_discount_percent_range CHECK (((discount_percent IS NULL) OR ((discount_percent >= (0)::numeric) AND (discount_percent <= (100)::numeric))));
ALTER TABLE public.quotes ADD CONSTRAINT valid_negotiation_markup_range CHECK (((negotiation_markup_percent IS NULL) OR ((negotiation_markup_percent >= (0)::numeric) AND (negotiation_markup_percent <= (50)::numeric))));
ALTER TABLE public.quotes ADD CONSTRAINT valid_priority CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])));
ALTER TABLE public.quotes ADD CONSTRAINT valid_quote_status CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'pending_approval'::text, 'sent'::text, 'viewed'::text, 'approved'::text, 'converted'::text, 'rejected'::text, 'expired'::text, 'cancelled'::text])));
ALTER TABLE public.quotes ADD CONSTRAINT valid_real_discount_pct_max CHECK (((real_discount_percent IS NULL) OR (real_discount_percent <= (100)::numeric)));
ALTER TABLE public.quotes ADD CONSTRAINT valid_shipping_cost_nonnegative CHECK (((shipping_cost IS NULL) OR (shipping_cost >= (0)::numeric)));
ALTER TABLE public.quotes ADD CONSTRAINT valid_shipping_type CHECK (((shipping_type IS NULL) OR (shipping_type = ANY (ARRAY['cif'::text, 'fob'::text, 'fob_pre'::text]))));
ALTER TABLE public.quotes ADD CONSTRAINT valid_subtotal_nonnegative CHECK (((subtotal IS NULL) OR (subtotal >= (0)::numeric)));
ALTER TABLE public.quotes ADD CONSTRAINT valid_total_nonnegative CHECK (((total IS NULL) OR (total >= (0)::numeric)));
ALTER TABLE public.quotes ADD CONSTRAINT valid_until_not_expired_for_active CHECK (((status = ANY (ARRAY['draft'::text, 'expired'::text, 'cancelled'::text, 'rejected'::text, 'converted'::text])) OR (valid_until IS NULL) OR (valid_until >= CURRENT_DATE)));
CREATE TABLE public.quote_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  quote_id uuid NOT NULL,
  product_id uuid,
  product_sku text,
  product_name text NOT NULL,
  product_description text,
  product_image_url text,
  has_personalization boolean DEFAULT false,
  personalization_config jsonb,
  personalization_cost numeric(10,2) DEFAULT 0,
  quantity integer DEFAULT 1 NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  discount_percentage numeric(5,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  subtotal numeric(10,2) NOT NULL,
  mockup_urls jsonb DEFAULT '[]'::jsonb,
  artwork_urls jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  color_name text,
  color_hex text,
  bitrix_product_id text,
  kit_group_id uuid,
  kit_name text,
  size_code text,
  gender text,
  sort_order integer DEFAULT 0,
  price_updated_at timestamp with time zone,
  price_freshness_threshold_days integer DEFAULT 60,
  price_confirmed_at timestamp with time zone,
  selected_packaging_id uuid,
  selected_packaging_name text,
  selected_packaging_unit_cost numeric(12,2),
  product_variant_id uuid,
  PRIMARY KEY(id)
);
ALTER TABLE public.quote_items ADD CONSTRAINT chk_quote_items_qty_pos CHECK ((quantity > 0));
ALTER TABLE public.quote_items ADD CONSTRAINT chk_quote_items_subtotal_positive CHECK ((subtotal >= (0)::numeric));
ALTER TABLE public.quote_items ADD CONSTRAINT chk_quote_items_unit_price_nonneg CHECK (((unit_price IS NULL) OR (unit_price >= (0)::numeric)));
ALTER TABLE public.quote_items ADD CONSTRAINT valid_product_reference CHECK (((product_id IS NOT NULL) OR ((product_name IS NOT NULL) AND (product_name <> ''::text))));
CREATE TABLE public.quote_item_personalizations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  quote_item_id uuid NOT NULL,
  technique_id uuid,
  technique_name text,
  colors_count integer DEFAULT 1 NOT NULL,
  positions_count integer DEFAULT 1 NOT NULL,
  area_cm2 numeric(8,2),
  width_cm numeric(8,2),
  height_cm numeric(8,2),
  personalized_quantity integer,
  setup_cost numeric(10,2) DEFAULT 0 NOT NULL,
  unit_cost numeric(10,2) DEFAULT 0 NOT NULL,
  total_cost numeric(10,2) DEFAULT 0 NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  location_code text,
  location_name text,
  PRIMARY KEY(id)
);
ALTER TABLE public.quote_item_personalizations ADD CONSTRAINT quote_item_personalizations_colors_count_check CHECK ((colors_count > 0));
ALTER TABLE public.quote_item_personalizations ADD CONSTRAINT quote_item_personalizations_positions_count_check CHECK ((positions_count > 0));
ALTER TABLE public.quote_item_personalizations ADD CONSTRAINT quote_item_personalizations_setup_cost_check CHECK ((setup_cost >= (0)::numeric));
ALTER TABLE public.quote_item_personalizations ADD CONSTRAINT quote_item_personalizations_total_cost_check CHECK ((total_cost >= (0)::numeric));
ALTER TABLE public.quote_item_personalizations ADD CONSTRAINT quote_item_personalizations_unit_cost_check CHECK ((unit_cost >= (0)::numeric));
CREATE TABLE public.quote_history (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  quote_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  field_changed text,
  old_value text,
  new_value text,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY(id)
);
ALTER TABLE quote_items ADD CONSTRAINT quote_items_quote_id_fkey FOREIGN KEY(quote_id) REFERENCES quotes(id) ON DELETE CASCADE;
ALTER TABLE quote_items ADD CONSTRAINT quote_items_product_id_fkey FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE quote_items ADD CONSTRAINT quote_items_product_variant_id_fkey FOREIGN KEY(product_variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;
ALTER TABLE quote_item_personalizations ADD CONSTRAINT quote_item_personalizations_quote_item_id_fkey FOREIGN KEY(quote_item_id) REFERENCES quote_items(id) ON DELETE CASCADE;
CREATE FUNCTION public.can_access_quote(qid uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT EXISTS(SELECT 1 FROM public.quotes WHERE id=qid) $$;
GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated,service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_item_personalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_variants_anon_read" ON public.product_variants FOR SELECT TO anon USING ((is_active = true));
CREATE POLICY "product_variants_delete" ON public.product_variants FOR DELETE TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_variants.product_id) AND is_org_owner_or_admin(p.organization_id)))));
CREATE POLICY "product_variants_oa_ins" ON public.product_variants FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_variants.product_id) AND is_org_owner_or_admin(p.organization_id)))));
CREATE POLICY "product_variants_oa_upd" ON public.product_variants FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_variants.product_id) AND is_org_owner_or_admin(p.organization_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM products p
  WHERE ((p.id = product_variants.product_id) AND is_org_owner_or_admin(p.organization_id)))));
CREATE POLICY "product_variants_public_read" ON public.product_variants FOR SELECT TO authenticated USING (true);
CREATE POLICY "org_admins_delete_quotes" ON public.quotes FOR DELETE TO authenticated USING (is_org_owner_or_admin(organization_id));
CREATE POLICY "org_members_create_quotes" ON public.quotes FOR INSERT TO authenticated WITH CHECK ((user_is_org_member(organization_id) AND (is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));
CREATE POLICY "quotes_select_scope" ON public.quotes FOR SELECT TO PUBLIC USING ((user_is_org_member(organization_id) AND (is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (assigned_to = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));
CREATE POLICY "quotes_update_scope" ON public.quotes FOR UPDATE TO PUBLIC USING ((user_is_org_member(organization_id) AND (is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (assigned_to = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))) WITH CHECK ((user_is_org_member(organization_id) AND (is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (assigned_to = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))));
CREATE POLICY "quote_items_delete" ON public.quote_items FOR DELETE TO authenticated USING (can_access_quote(quote_id));
CREATE POLICY "quote_items_insert" ON public.quote_items FOR INSERT TO authenticated WITH CHECK (can_access_quote(quote_id));
CREATE POLICY "quote_items_select" ON public.quote_items FOR SELECT TO authenticated USING (can_access_quote(quote_id));
CREATE POLICY "quote_items_update" ON public.quote_items FOR UPDATE TO authenticated USING (can_access_quote(quote_id)) WITH CHECK (can_access_quote(quote_id));
CREATE POLICY "Sellers and coord create quote_history" ON public.quote_history FOR INSERT TO authenticated WITH CHECK (((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (EXISTS ( SELECT 1
   FROM quotes q
  WHERE ((q.id = quote_history.quote_id) AND ((q.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (q.created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (q.assigned_to = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))))));
CREATE POLICY "Sellers and coord view quote_history" ON public.quote_history FOR SELECT TO authenticated USING ((is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (EXISTS ( SELECT 1
   FROM quotes q
  WHERE ((q.id = quote_history.quote_id) AND ((q.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (q.created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (q.assigned_to = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))));
CREATE POLICY "qip_delete_own_quote" ON public.quote_item_personalizations FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (quote_items qi
     JOIN quotes q ON ((q.id = qi.quote_id)))
  WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));
CREATE POLICY "qip_insert_own_quote" ON public.quote_item_personalizations FOR INSERT TO PUBLIC WITH CHECK ((EXISTS ( SELECT 1
   FROM (quote_items qi
     JOIN quotes q ON ((q.id = qi.quote_id)))
  WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));
CREATE POLICY "qip_select_own_quote" ON public.quote_item_personalizations FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (quote_items qi
     JOIN quotes q ON ((q.id = qi.quote_id)))
  WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));
CREATE POLICY "qip_update_own_quote" ON public.quote_item_personalizations FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (quote_items qi
     JOIN quotes q ON ((q.id = qi.quote_id)))
  WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))))));
CREATE OR REPLACE FUNCTION public.fn_quote_children_enforce_parent_immutability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _parent_quote_id uuid;
  _parent_status text;
  _msg text;
BEGIN
  -- fix_version=2026-07-09-quote-children-immutability-bypass ANTI-REGRESSÃO
  -- Bypass para service_role via JWT claim (PostgREST com JWT token)
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- NOVO: Bypass para contexto sem usuário autenticado (service_role sem JWT,
  -- edge functions com service_role_key, execute_sql, migrations, crons).
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'quote_items' THEN
    _parent_quote_id := COALESCE(NEW.quote_id, OLD.quote_id);
  ELSIF TG_TABLE_NAME = 'quote_item_personalizations' THEN
    SELECT qi.quote_id INTO _parent_quote_id
    FROM public.quote_items qi
    WHERE qi.id = COALESCE(NEW.quote_item_id, OLD.quote_item_id);
  END IF;

  IF _parent_quote_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT status INTO _parent_status
  FROM public.quotes WHERE id = _parent_quote_id;

  IF _parent_status IN ('approved', 'converted') THEN
    _msg := 'Nao e possivel alterar itens de orcamento ja aprovado/convertido (status ' ||
            _parent_status || '). Crie um novo orcamento.';
    RAISE EXCEPTION '%', _msg USING ERRCODE = '23514';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fn_qip_propagate_to_quote_items()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _quote_item_id uuid;
  _new_personalization_cost numeric(12,2);
BEGIN
  _quote_item_id := COALESCE(NEW.quote_item_id, OLD.quote_item_id);

  SELECT COALESCE(SUM(total_cost), 0) INTO _new_personalization_cost
  FROM public.quote_item_personalizations
  WHERE quote_item_id = _quote_item_id;

  UPDATE public.quote_items
  SET personalization_cost = _new_personalization_cost,
      has_personalization = (_new_personalization_cost > 0),
      updated_at = now()
  WHERE id = _quote_item_id
    AND personalization_cost IS DISTINCT FROM _new_personalization_cost;

  RETURN COALESCE(NEW, OLD);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fn_quote_items_calc_subtotal()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  NEW.subtotal := COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_price, 0)
                + COALESCE(NEW.personalization_cost, 0)
                - COALESCE(NEW.discount_amount, 0);
  RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION public.fn_quotes_calc_real_values()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_markup numeric;
  v_effective_discount numeric;
BEGIN
  -- Cópia local clampada usada APENAS como divisor defensivo (não regrava a coluna).
  -- A faixa válida é garantida pelo CHECK valid_negotiation_markup_range ([0,50]):
  -- valores fora de faixa são rejeitados pelo constraint (fail-loud), não silenciados.
  v_markup := LEAST(50, GREATEST(0, COALESCE(NEW.negotiation_markup_percent, 0)));

  IF v_markup > 0 THEN
    NEW.real_subtotal := ROUND(NEW.subtotal / (1 + v_markup / 100.0), 2);
  ELSE
    NEW.real_subtotal := NEW.subtotal;
  END IF;

  -- Desconto efetivo derivado no servidor (não confia no cliente):
  -- se há percentual, ele tem precedência e é convertido sobre o subtotal apresentado;
  -- caso contrário usa o valor absoluto. Fecha o gap onde discount_percent setado
  -- com discount_amount=0 zerava o real_discount_percent e burlava a alçada.
  IF COALESCE(NEW.discount_percent, 0) > 0 THEN
    v_effective_discount := ROUND(NEW.subtotal * NEW.discount_percent / 100.0, 2);
  ELSE
    v_effective_discount := COALESCE(NEW.discount_amount, 0);
  END IF;

  IF NEW.real_subtotal > 0 THEN
    NEW.real_discount_percent := ROUND(
      ((NEW.real_subtotal - (NEW.subtotal - v_effective_discount)) / NEW.real_subtotal) * 100,
      2
    );
  ELSE
    NEW.real_discount_percent := 0;
  END IF;

  RETURN NEW;
END
$function$
;
CREATE OR REPLACE FUNCTION public.fn_quotes_enforce_immutability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _msg text;
BEGIN
  -- fix_version=2026-07-09-immutability-service-role-bypass ANTI-REGRESSÃO
  -- Bypass para service_role via JWT claim (PostgREST com JWT token)
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- NOVO: Bypass para contexto sem usuário autenticado (service_role sem JWT,
  -- edge functions com service_role_key, execute_sql, migrations, crons).
  -- auth.uid() IS NULL = indicador robusto de service_role sem JWT.
  -- O bypass request.jwt.claim.role acima falha quando NULL (NULL='service_role'→FALSE).
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.status NOT IN ('approved', 'converted') THEN
    RETURN NEW;
  END IF;

  IF OLD.* IS NOT DISTINCT FROM NEW.* THEN
    RETURN NEW;
  END IF;

  IF OLD.status <> NEW.status THEN
    IF (OLD.status = 'approved' AND NEW.status IN ('converted', 'expired'))
       OR (OLD.status = 'converted' AND NEW.status = 'expired') THEN
      IF (
        OLD.client_id IS DISTINCT FROM NEW.client_id OR
        OLD.client_name IS DISTINCT FROM NEW.client_name OR
        OLD.subtotal IS DISTINCT FROM NEW.subtotal OR
        OLD.discount_percent IS DISTINCT FROM NEW.discount_percent OR
        OLD.discount_amount IS DISTINCT FROM NEW.discount_amount OR
        OLD.total IS DISTINCT FROM NEW.total OR
        OLD.negotiation_markup_percent IS DISTINCT FROM NEW.negotiation_markup_percent OR
        OLD.real_subtotal IS DISTINCT FROM NEW.real_subtotal OR
        OLD.real_discount_percent IS DISTINCT FROM NEW.real_discount_percent OR
        OLD.shipping_cost IS DISTINCT FROM NEW.shipping_cost OR
        OLD.tax_amount IS DISTINCT FROM NEW.tax_amount OR
        OLD.seller_id IS DISTINCT FROM NEW.seller_id OR
        OLD.created_by IS DISTINCT FROM NEW.created_by OR
        OLD.assigned_to IS DISTINCT FROM NEW.assigned_to
      ) THEN
        _msg := 'Orcamento em status ' || OLD.status ||
                ' e imutavel. So a transicao de status e permitida; valores e atribuicoes nao podem mudar. Crie um novo orcamento.';
        RAISE EXCEPTION '%', _msg USING ERRCODE = '23514';
      END IF;
      RETURN NEW;
    ELSE
      _msg := 'Transicao de status nao permitida: ' || OLD.status || ' para ' || NEW.status ||
              '. Orcamento em status ' || OLD.status || ' so pode ir para converted ou expired.';
      RAISE EXCEPTION '%', _msg USING ERRCODE = '23514';
    END IF;
  END IF;

  _msg := 'Orcamento em status ' || OLD.status ||
          ' e imutavel. Crie um novo orcamento para alterar valores.';
  RAISE EXCEPTION '%', _msg USING ERRCODE = '23514';
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fn_quotes_recalc_subtotal_from_items()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _quote_id uuid;
  _quote_status text;
  _markup numeric;
  _disc_amount_db numeric;
  _disc_pct numeric;
  _ship_type text;
  _ship_cost numeric;
  _real_subtotal numeric(12,2);
  _new_subtotal numeric(12,2);
  _ship_value numeric(12,2);
  _disc_value numeric(12,2);
  _new_total numeric(12,2);
BEGIN
  _quote_id := COALESCE(NEW.quote_id, OLD.quote_id);
  IF _quote_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT
    status,
    LEAST(50, GREATEST(0, COALESCE(negotiation_markup_percent, 0))),
    COALESCE(discount_amount, 0),
    COALESCE(discount_percent, 0),
    shipping_type,
    COALESCE(shipping_cost, 0)
  INTO _quote_status, _markup, _disc_amount_db, _disc_pct, _ship_type, _ship_cost
  FROM public.quotes WHERE id = _quote_id;

  -- Nao mexer em quotes aprovados/convertidos (imutaveis)
  IF _quote_status IN ('approved', 'converted') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- REAL: soma pura dos itens (sem markup)
  SELECT COALESCE(SUM(quantity * unit_price + COALESCE(personalization_cost, 0)), 0)
  INTO _real_subtotal
  FROM public.quote_items
  WHERE quote_id = _quote_id;

  -- APRESENTADO ao cliente: aplica markup
  _new_subtotal := ROUND(_real_subtotal * (1 + _markup / 100.0), 2);

  -- DESCONTO: discount_percent tem prioridade (espelha logica do frontend)
  IF _disc_pct > 0 THEN
    _disc_value := ROUND(_new_subtotal * (_disc_pct / 100.0), 2);
  ELSE
    _disc_value := _disc_amount_db;
  END IF;

  -- FRETE: somente 'fob_pre' (pré-negociado com custo) entra no total.
  -- Alinhado ao frontend (calculateQuoteTotals): cif/fob/null não somam.
  _ship_value := CASE WHEN _ship_type = 'fob_pre' THEN _ship_cost ELSE 0 END;

  -- TOTAL final
  _new_total := _new_subtotal - _disc_value + _ship_value;

  -- UPDATE apenas se mudou (evita loop com trigger BEFORE em quotes)
  UPDATE public.quotes
  SET subtotal = _new_subtotal,
      total = _new_total,
      discount_amount = _disc_value,
      updated_at = now()
  WHERE id = _quote_id
    AND (subtotal IS DISTINCT FROM _new_subtotal
      OR total IS DISTINCT FROM _new_total
      OR discount_amount IS DISTINCT FROM _disc_value);

  RETURN COALESCE(NEW, OLD);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.increment_quote_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  _old jsonb := to_jsonb(OLD)
                 - 'subtotal' - 'total' - 'discount_amount'
                 - 'real_subtotal' - 'real_discount_percent'
                 - 'updated_at' - 'version'
                 - 'discount_approval_status' - 'discount_approved_at';
  _new jsonb := to_jsonb(NEW)
                 - 'subtotal' - 'total' - 'discount_amount'
                 - 'real_subtotal' - 'real_discount_percent'
                 - 'updated_at' - 'version'
                 - 'discount_approval_status' - 'discount_approved_at';
BEGIN
  IF _old IS DISTINCT FROM _new THEN
    NEW.version := COALESCE(OLD.version, 0) + 1;
  ELSE
    -- Update derivado-apenas (cascata de recálculo / espelho de aprovação): preserva a versão.
    NEW.version := COALESCE(OLD.version, 1);
  END IF;
  RETURN NEW;
END
$function$
;
CREATE TRIGGER trg_qip_parent_immutable BEFORE INSERT OR DELETE OR UPDATE ON public.quote_item_personalizations FOR EACH ROW EXECUTE FUNCTION fn_quote_children_enforce_parent_immutability();
CREATE TRIGGER trg_qip_propagate AFTER INSERT OR DELETE OR UPDATE ON public.quote_item_personalizations FOR EACH ROW EXECUTE FUNCTION fn_qip_propagate_to_quote_items();
CREATE TRIGGER trg_quote_items_calc_subtotal BEFORE INSERT OR UPDATE OF quantity, unit_price, personalization_cost, discount_amount ON public.quote_items FOR EACH ROW EXECUTE FUNCTION fn_quote_items_calc_subtotal();
CREATE TRIGGER trg_quote_items_parent_immutable BEFORE INSERT OR DELETE OR UPDATE ON public.quote_items FOR EACH ROW EXECUTE FUNCTION fn_quote_children_enforce_parent_immutability();
CREATE TRIGGER trg_quotes_calc_real_values BEFORE INSERT OR UPDATE OF subtotal, discount_amount, negotiation_markup_percent ON public.quotes FOR EACH ROW EXECUTE FUNCTION fn_quotes_calc_real_values();
CREATE TRIGGER trg_quotes_immutability BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION fn_quotes_enforce_immutability();
CREATE TRIGGER trg_quotes_recalc_from_items AFTER INSERT OR DELETE OR UPDATE ON public.quote_items FOR EACH ROW EXECUTE FUNCTION fn_quotes_recalc_subtotal_from_items();
CREATE TRIGGER trg_quotes_version BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION increment_quote_version();
-- Synthetic fault/discount guards for atomicity, NOT production discount authorization.
CREATE FUNCTION public.fixture_late_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF current_setting('fixture.fail_history',true)='on' THEN RAISE EXCEPTION 'fixture late failure'; END IF; RETURN NEW; END $$;
CREATE TRIGGER fixture_late_reject BEFORE INSERT ON quote_history FOR EACH ROW EXECUTE FUNCTION fixture_late_reject();
