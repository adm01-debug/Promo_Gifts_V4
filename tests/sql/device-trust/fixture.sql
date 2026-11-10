-- Local PostgreSQL fixture based on read-only production metadata, not a production bootstrap.
CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE anon NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER
AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
INSERT INTO auth.users VALUES
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');

CREATE TABLE public.user_known_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fingerprint text NOT NULL,
  device_name text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_known_devices_pkey PRIMARY KEY (id),
  CONSTRAINT user_known_devices_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE INDEX idx_user_known_devices_user_id ON public.user_known_devices (user_id);
ALTER TABLE public.user_known_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own devices" ON public.user_known_devices
  FOR ALL TO public USING ((SELECT (SELECT auth.uid())) = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_known_devices TO authenticated;
-- A column ACL makes preservation checks cover both table and column permissions.
GRANT SELECT (fingerprint) ON public.user_known_devices TO authenticated;
COMMENT ON TABLE public.user_known_devices IS 'Local fixture table comment';
COMMENT ON COLUMN public.user_known_devices.fingerprint IS 'Opaque original fingerprint';
INSERT INTO public.user_known_devices(id, user_id, fingerprint, device_name, last_seen_at, created_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'original-fingerprint-A', 'Original device A', '2026-01-01', '2025-12-01'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
   'original-fingerprint-B', NULL, '2026-02-01', '2025-12-02');

CREATE FUNCTION public.test_device_metadata() RETURNS jsonb LANGUAGE sql STABLE AS $$
SELECT jsonb_build_object(
  'columns', (SELECT jsonb_agg(jsonb_build_object(
    'name', a.attname, 'type', a.atttypid, 'number', a.attnum, 'notnull', a.attnotnull,
    'default', pg_get_expr(d.adbin, d.adrelid), 'acl', a.attacl::text,
    'comment', col_description(a.attrelid, a.attnum)) ORDER BY a.attnum)
    FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE a.attrelid='public.user_known_devices'::regclass AND a.attnum>0
      AND NOT a.attisdropped AND a.attname<>'is_trusted'),
  'constraints', (SELECT jsonb_agg(jsonb_build_object('name', conname, 'definition', pg_get_constraintdef(oid)) ORDER BY conname)
    FROM pg_constraint WHERE conrelid='public.user_known_devices'::regclass),
  'indexes', (SELECT jsonb_agg(indexdef ORDER BY indexname) FROM pg_indexes
    WHERE schemaname='public' AND tablename='user_known_devices'),
  'policies', (SELECT jsonb_agg(to_jsonb(p) ORDER BY policyname) FROM pg_policies p
    WHERE schemaname='public' AND tablename='user_known_devices'),
  'table', (SELECT jsonb_build_object('acl', relacl::text, 'owner', relowner,
    'rls', relrowsecurity, 'forced', relforcerowsecurity, 'options', reloptions,
    'comment', obj_description(oid)) FROM pg_class WHERE oid='public.user_known_devices'::regclass)
);
$$;
CREATE TABLE public.test_device_before AS SELECT public.test_device_metadata() AS metadata;
CREATE TABLE public.test_device_rows_before AS
  SELECT jsonb_agg(to_jsonb(d) ORDER BY id) AS data FROM public.user_known_devices d;
