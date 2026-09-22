-- Reduced trigger/FK fixture. No real accounts, passwords, sessions or business data.
CREATE SCHEMA auth;
CREATE TYPE public.app_role AS ENUM ('dev','supervisor','admin','manager','agente','coordenador','vendedor');
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb);
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid UNIQUE REFERENCES auth.users(id),
  email text, full_name text, role text CHECK (role IN ('admin','manager','sales','seller')),
  department text, is_active boolean, preferences jsonb, created_at timestamptz, updated_at timestamptz
);
CREATE TABLE public.user_roles (
  user_id uuid REFERENCES public.profiles(user_id), role public.app_role, granted_by uuid,
  PRIMARY KEY (user_id, role)
);
CREATE TABLE public.seller_discount_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(user_id),
  max_discount_percent numeric(5,2) DEFAULT 5.0 NOT NULL CHECK (max_discount_percent BETWEEN 0 AND 100),
  approval_required_above numeric(5,2) DEFAULT 10.0 CHECK (approval_required_above BETWEEN 0 AND 100),
  notes text, set_by uuid REFERENCES public.profiles(user_id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
