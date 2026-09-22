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
