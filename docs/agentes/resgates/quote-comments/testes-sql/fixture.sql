-- Isolated PostgreSQL fixture only. No production data or credentials.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
CREATE TABLE public.test_org_members (organization_id uuid, user_id uuid, coordinator boolean NOT NULL DEFAULT false, PRIMARY KEY (organization_id,user_id));
GRANT SELECT ON public.test_org_members TO authenticated;
CREATE FUNCTION public.user_is_org_member(target_org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM public.test_org_members m WHERE m.organization_id=target_org AND m.user_id=(SELECT auth.uid()));
$$;
CREATE FUNCTION public.is_coord_or_above(target_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM public.test_org_members m WHERE m.user_id=target_user AND m.coordinator);
$$;
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  assigned_to uuid REFERENCES auth.users(id),
  organization_id uuid NOT NULL
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.quotes TO authenticated;
-- Exact predicate read from the live quotes_select_scope policy on 2026-11-10.
CREATE POLICY quotes_select_scope ON public.quotes FOR SELECT TO public USING (
  user_is_org_member(organization_id)
  AND (is_coord_or_above((SELECT auth.uid())) OR seller_id=(SELECT auth.uid()) OR created_by=(SELECT auth.uid()) OR assigned_to=(SELECT auth.uid()))
);
INSERT INTO auth.users(id) SELECT format('00000000-0000-0000-0000-%s', lpad(n::text,12,'0'))::uuid FROM generate_series(1,6) AS n;
INSERT INTO public.test_org_members(organization_id,user_id,coordinator)
SELECT '10000000-0000-0000-0000-000000000001', id, id='00000000-0000-0000-0000-000000000003'::uuid FROM auth.users WHERE id <> '00000000-0000-0000-0000-000000000004'::uuid;
INSERT INTO public.test_org_members VALUES ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004',false);
INSERT INTO public.quotes VALUES
('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001'),
('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',null,'10000000-0000-0000-0000-000000000001'),
('20000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004',null,null,'10000000-0000-0000-0000-000000000002'),
('20000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001',null,null,'10000000-0000-0000-0000-000000000001');
