\set ON_ERROR_STOP on

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;

CREATE TYPE public.app_role AS ENUM (
  'dev', 'supervisor', 'admin', 'manager', 'agente', 'coordenador', 'vendedor'
);

CREATE TABLE auth.users (id UUID PRIMARY KEY);
CREATE TABLE public.user_roles (user_id UUID NOT NULL, role public.app_role NOT NULL);

CREATE FUNCTION auth.uid() RETURNS UUID
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', TRUE), '')::UUID $$;

CREATE FUNCTION public.has_role(_user_id UUID, _role public.app_role) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE TABLE public.magazines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID,
  title TEXT NOT NULL DEFAULT 'Nova Revista',
  subtitle TEXT NOT NULL DEFAULT '' CHECK (char_length(subtitle) <= 300),
  template_id TEXT NOT NULL DEFAULT 'editorial-vogue',
  branding JSONB NOT NULL DEFAULT '{}'::JSONB,
  content_settings JSONB NOT NULL DEFAULT '{}'::JSONB,
  page_order JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  public_token TEXT,
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.magazine_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  magazine_id UUID NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  variant_color_name TEXT,
  position NUMERIC NOT NULL DEFAULT 0,
  page_number INTEGER,
  product_snapshot JSONB NOT NULL,
  overrides JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (magazine_id, position) DEFERRABLE INITIALLY DEFERRED,
  UNIQUE (magazine_id, product_id)
);

INSERT INTO auth.users (id) VALUES
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003');
INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000003', 'admin');
INSERT INTO public.magazines (id, owner_id, title, updated_at) VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Revista de teste',
  '2026-09-09T12:00:00Z'
);
