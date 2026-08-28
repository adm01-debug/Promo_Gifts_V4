\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- ---------------------------------------------------------------------------
-- 1. v_kit_component_print_areas_public: aplica e prova rollback de reloptions.
-- ---------------------------------------------------------------------------
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean
);
CREATE TABLE public.product_kit_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_product_id uuid NOT NULL REFERENCES public.products(id)
);
CREATE TABLE public.kit_component_print_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_component_id uuid NOT NULL REFERENCES public.product_kit_components(id),
  location_code text,
  location_name text,
  location_order integer,
  max_width numeric,
  max_height numeric,
  shape text,
  is_curved boolean,
  technique_order jsonb,
  is_active boolean NOT NULL DEFAULT true
);

CREATE VIEW public.v_kit_component_print_areas_public
WITH (security_invoker = false) AS
SELECT kpa.id, kpa.kit_component_id, kpa.location_code, kpa.location_name,
       kpa.location_order, kpa.max_width, kpa.max_height, kpa.shape,
       kpa.is_curved, kpa.technique_order
FROM public.kit_component_print_areas kpa
JOIN public.product_kit_components pkc ON pkc.id = kpa.kit_component_id
JOIN public.products p ON p.id = pkc.kit_product_id
WHERE kpa.is_active = true AND p.is_active = true AND p.is_deleted IS NOT TRUE;

BEGIN;
\ir ../../supabase/migrations/20260828141000_forward_only_v_kit_component_print_areas_security_invoker.sql
DO $$
DECLARE _options text[];
BEGIN
  SELECT reloptions INTO _options
  FROM pg_catalog.pg_class
  WHERE oid = 'public.v_kit_component_print_areas_public'::regclass;
  IF NOT (_options @> ARRAY['security_invoker=true']) THEN
    RAISE EXCEPTION 'view migration scenario failed';
  END IF;
END $$;
ROLLBACK;

DO $$
DECLARE _options text[];
BEGIN
  SELECT reloptions INTO _options
  FROM pg_catalog.pg_class
  WHERE oid = 'public.v_kit_component_print_areas_public'::regclass;
  IF NOT (_options @> ARRAY['security_invoker=false']) THEN
    RAISE EXCEPTION 'view rollback scenario failed';
  END IF;
END $$;

DROP VIEW public.v_kit_component_print_areas_public;
DROP TABLE public.kit_component_print_areas, public.product_kit_components, public.products;

-- ---------------------------------------------------------------------------
-- 2. create_quote_transactional: fixture de contrato live + cenários atômicos.
-- ---------------------------------------------------------------------------
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL DEFAULT '', client_id uuid, contact_id uuid,
  client_name text NOT NULL DEFAULT '', client_email text, client_phone text,
  client_company text, client_cnpj text, seller_id uuid, created_by uuid,
  organization_id uuid NOT NULL, status text NOT NULL DEFAULT 'draft',
  subtotal numeric NOT NULL DEFAULT 0, discount_percent numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0, total numeric NOT NULL DEFAULT 0,
  negotiation_markup_percent numeric NOT NULL DEFAULT 0,
  real_discount_percent numeric NOT NULL DEFAULT 0,
  payment_method text, payment_terms text, delivery_time text, shipping_type text,
  shipping_cost numeric NOT NULL DEFAULT 0, notes text, internal_notes text,
  valid_until date
);
CREATE TABLE public.user_organizations (
  user_id uuid NOT NULL, organization_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id)
);
CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid NOT NULL REFERENCES public.quotes(id),
  product_id uuid, product_name text, product_sku text, product_image_url text,
  quantity integer, unit_price numeric, subtotal numeric, discount_percentage numeric,
  discount_amount numeric, color_name text, color_hex text, size_code text, gender text,
  sort_order integer, notes text, kit_group_id uuid, kit_name text,
  price_confirmed_at timestamptz, price_updated_at timestamptz,
  price_freshness_threshold_days integer, bitrix_product_id text,
  personalization_cost numeric NOT NULL DEFAULT 0
);
CREATE TABLE public.quote_item_personalizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_item_id uuid NOT NULL REFERENCES public.quote_items(id),
  technique_id uuid, technique_name text, location_code text, location_name text,
  personalized_quantity integer, colors_count integer, positions_count integer,
  area_cm2 numeric, width_cm numeric, height_cm numeric,
  setup_cost numeric, unit_cost numeric, total_cost numeric, notes text
);
CREATE TABLE public.quote_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid NOT NULL,
  user_id uuid NOT NULL, action text NOT NULL, description text, metadata jsonb
);

CREATE OR REPLACE FUNCTION public.user_is_org_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_organizations
    WHERE user_id = auth.uid() AND organization_id = _org_id
  )
$$;

CREATE FUNCTION public.create_quote_transactional(_quote jsonb, _items jsonb)
RETURNS public.quotes
LANGUAGE plpgsql
AS $$
BEGIN
  -- Audited-live markers required by the migration drift guard:
  -- contact_id, client_cnpj, personalization_cost
  RAISE EXCEPTION 'wave1_original_create_quote_marker';
END
$$;

BEGIN;
\ir ../../supabase/migrations/20260828141100_forward_only_create_quote_transactional_auth_scope.sql

DO $$
DECLARE
  _actor uuid := '10000000-0000-4000-8000-000000000001';
  _org uuid := '20000000-0000-4000-8000-000000000001';
  _contact uuid := '30000000-0000-4000-8000-000000000001';
  _created public.quotes;
  _before_quotes bigint;
  _before_items bigint;
  _personalization_cost numeric;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', _actor::text, true);
  INSERT INTO public.user_organizations(user_id, organization_id) VALUES (_actor, _org);

  _created := public.create_quote_transactional(
    jsonb_build_object(
      'quote_number', 'WAVE1-OK',
      'organization_id', 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      'contact_id', _contact,
      'client_cnpj', '12.345.678/0001-90',
      'client_name', 'Cliente Teste',
      'subtotal', 100,
      'total', 100
    ),
    jsonb_build_array(jsonb_build_object(
      'product_name', 'Produto Teste',
      'quantity', 2,
      'unit_price', 50,
      'subtotal', 100,
      'personalization_cost', 12.5
    ))
  );

  IF _created.organization_id <> _org OR _created.seller_id <> _actor
     OR _created.created_by <> _actor OR _created.contact_id <> _contact
     OR _created.client_cnpj <> '12.345.678/0001-90' THEN
    RAISE EXCEPTION 'create_quote identity/contact scenario failed';
  END IF;

  SELECT personalization_cost INTO _personalization_cost
  FROM public.quote_items WHERE quote_id = _created.id;
  IF _personalization_cost <> 12.5 THEN
    RAISE EXCEPTION 'personalization_cost preservation failed';
  END IF;

  SELECT count(*) INTO _before_quotes FROM public.quotes;
  SELECT count(*) INTO _before_items FROM public.quote_items;
  BEGIN
    PERFORM public.create_quote_transactional(
      jsonb_build_object('quote_number', 'WAVE1-ROLLBACK', 'subtotal', 1, 'total', 1),
      jsonb_build_array(jsonb_build_object('product_id', 'not-a-uuid'))
    );
    RAISE EXCEPTION 'malformed item should have failed';
  EXCEPTION WHEN invalid_text_representation THEN
    NULL;
  END;
  IF (SELECT count(*) FROM public.quotes) <> _before_quotes
     OR (SELECT count(*) FROM public.quote_items) <> _before_items THEN
    RAISE EXCEPTION 'create_quote statement atomicity failed';
  END IF;

  PERFORM set_config(
    'request.jwt.claim.sub',
    '10000000-0000-4000-8000-000000000099',
    true
  );
  BEGIN
    PERFORM public.create_quote_transactional(
      jsonb_build_object('quote_number', 'WAVE1-NO-ORG'),
      '[]'::jsonb
    );
    RAISE EXCEPTION 'missing organization should have failed';
  EXCEPTION WHEN not_null_violation THEN
    NULL;
  END;
END $$;
ROLLBACK;

DO $$
DECLARE _definition text;
BEGIN
  SELECT pg_get_functiondef('public.create_quote_transactional(jsonb,jsonb)'::regprocedure)
  INTO _definition;
  IF strpos(_definition, 'wave1_original_create_quote_marker') = 0 THEN
    RAISE EXCEPTION 'create_quote rollback did not restore original definition';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. fn_quotes_validate_discount: cross-user, alçada, aprovação e bypasses.
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_roles (user_id uuid NOT NULL, role text NOT NULL);
CREATE TABLE public.seller_discount_limits (
  user_id uuid PRIMARY KEY, max_discount_percent numeric NOT NULL
);
CREATE TABLE public.discount_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid NOT NULL,
  status text NOT NULL, valid_until timestamptz,
  requested_discount_percent numeric NOT NULL,
  quote_snapshot_hash text
);

CREATE OR REPLACE FUNCTION public.is_supervisor_or_above(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('supervisor', 'admin', 'dev')
  )
$$;

CREATE OR REPLACE FUNCTION public.compute_quote_snapshot_hash(_quote_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$ SELECT 'snapshot-' || _quote_id::text $$;

CREATE FUNCTION public.fn_quotes_validate_discount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Audited-live markers required by the migration drift guard:
  -- is_coord_or_above(_seller_id), auth.uid() IS NULL, cron_expire,
  -- pending_approval, valid_until IS NULL OR valid_until > now()
  RAISE EXCEPTION 'wave1_original_discount_marker';
END
$$;

BEGIN;
\ir ../../supabase/migrations/20260828141200_forward_only_fn_quotes_validate_discount_cross_user.sql

CREATE TRIGGER trg_wave1_discount
BEFORE INSERT OR UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.fn_quotes_validate_discount();

DO $$
DECLARE
  _actor uuid := '40000000-0000-4000-8000-000000000001';
  _seller uuid := '50000000-0000-4000-8000-000000000001';
  _supervisor uuid := '50000000-0000-4000-8000-000000000002';
  _org uuid := '60000000-0000-4000-8000-000000000001';
  _approved_quote uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', _actor::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  INSERT INTO public.seller_discount_limits(user_id, max_discount_percent)
  VALUES (_seller, 10), (_supervisor, 0);
  INSERT INTO public.user_roles(user_id, role) VALUES (_supervisor, 'supervisor');

  INSERT INTO public.quotes(organization_id, seller_id, real_discount_percent, status)
  VALUES (_org, _seller, 5, 'draft');

  BEGIN
    INSERT INTO public.quotes(organization_id, seller_id, real_discount_percent, status)
    VALUES (_org, _seller, 20, 'draft');
    RAISE EXCEPTION 'over-limit draft should have failed';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  INSERT INTO public.quotes(organization_id, seller_id, real_discount_percent, status)
  VALUES (_org, _seller, 20, 'pending_approval')
  RETURNING id INTO _approved_quote;

  INSERT INTO public.quotes(organization_id, seller_id, real_discount_percent, status)
  VALUES (_org, _supervisor, 99, 'draft');

  INSERT INTO public.quotes(organization_id, seller_id, real_discount_percent, status)
  VALUES (_org, _seller, 99, 'expired');

  INSERT INTO public.discount_approval_requests(
    quote_id, status, valid_until, requested_discount_percent, quote_snapshot_hash
  ) VALUES (
    _approved_quote, 'approved', now() + interval '1 day', 20,
    public.compute_quote_snapshot_hash(_approved_quote)
  );
  UPDATE public.quotes SET status = 'pending' WHERE id = _approved_quote;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  INSERT INTO public.quotes(organization_id, seller_id, real_discount_percent, status)
  VALUES (_org, _seller, 99, 'draft');
END $$;
ROLLBACK;

DO $$
DECLARE _definition text;
BEGIN
  SELECT pg_get_functiondef('public.fn_quotes_validate_discount()'::regprocedure)
  INTO _definition;
  IF strpos(_definition, 'wave1_original_discount_marker') = 0 THEN
    RAISE EXCEPTION 'discount function rollback did not restore original definition';
  END IF;
END $$;

SELECT 'wave1 forward-only migration scenarios: PASS' AS result;
