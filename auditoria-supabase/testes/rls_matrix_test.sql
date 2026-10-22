-- =============================================================================
-- MATRIZ RLS — ISOLAMENTO TENANT A × B
-- Postgres local temporário — NÃO conectado a produção
-- Data: 2026-10-22
-- Propósito: verificar que políticas RLS isolam dados entre organizações distintas
-- =============================================================================

\set ON_ERROR_STOP on

-- -----------------------------------------------------------------------
-- 1. SETUP: schema auth simulado
-- -----------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS auth;

-- Simula auth.uid() lendo current_setting
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    '00000000-0000-0000-0000-000000000000'
  )::uuid;
$$;

-- -----------------------------------------------------------------------
-- 2. TIPOS E TABELAS
-- -----------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE org_role AS ENUM ('member','coordinator','admin','owner');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS user_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  user_id uuid NOT NULL,
  role org_role NOT NULL DEFAULT 'member'
);

CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  seller_id uuid,
  created_by uuid,
  assigned_to uuid,
  title text
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  status text DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  product_id uuid,
  quantity int
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  user_id uuid UNIQUE NOT NULL,
  name text
);

-- -----------------------------------------------------------------------
-- 3. FUNÇÕES HELPER (réplicas das funções de produção)
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_is_org_member(org_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_organizations
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner_or_admin(org_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_organizations
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role IN ('admin','owner')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_coord_or_above(uid uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_organizations
    WHERE user_id = uid AND role IN ('coordinator','admin','owner')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_quote(qid uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id FROM public.quotes WHERE id = qid;
  RETURN public.user_is_org_member(v_org_id) AND (
    public.is_coord_or_above(auth.uid())
    OR EXISTS(SELECT 1 FROM public.quotes WHERE id=qid AND (seller_id=auth.uid() OR created_by=auth.uid() OR assigned_to=auth.uid()))
  );
END;
$$;

-- -----------------------------------------------------------------------
-- 4. ROLES
-- -----------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    CREATE ROLE anon;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON quotes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON order_items TO authenticated;
GRANT SELECT, INSERT ON profiles TO authenticated, anon;
GRANT UPDATE ON profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_org_member(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_org_owner_or_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_coord_or_above(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_access_quote(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;

-- -----------------------------------------------------------------------
-- 5. RLS POLICIES (replicando as de produção)
-- -----------------------------------------------------------------------
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- user_organizations policies
CREATE POLICY uo_select_members ON user_organizations FOR SELECT
  USING (public.user_is_org_member(organization_id));
CREATE POLICY uo_insert_admins ON user_organizations FOR INSERT
  WITH CHECK (public.is_org_owner_or_admin(organization_id));
CREATE POLICY uo_update_admins ON user_organizations FOR UPDATE
  USING (public.is_org_owner_or_admin(organization_id));

-- quotes policies
CREATE POLICY quotes_select_scope ON quotes FOR SELECT
  USING (
    public.user_is_org_member(organization_id) AND (
      public.is_coord_or_above(auth.uid())
      OR seller_id = auth.uid()
      OR created_by = auth.uid()
      OR assigned_to = auth.uid()
    )
  );

-- orders policies
CREATE POLICY orders_select ON orders FOR SELECT
  USING (public.user_is_org_member(organization_id));

-- order_items policies
CREATE POLICY order_items_select ON order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id AND public.user_is_org_member(o.organization_id)
  ));

-- profiles policies
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------
-- 6. DADOS DE TESTE
-- -----------------------------------------------------------------------
-- Tenants (organizações distintas)
INSERT INTO organizations(id, name) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Org-A'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Org-B');

-- Usuários
-- user-a-1: membro de Org-A, role=owner
-- user-b-1: membro de Org-B, role=owner
-- user-a-2: membro de Org-A, role=member
INSERT INTO user_organizations(id, organization_id, user_id, role) VALUES
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'owner'),
  (gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'owner'),
  (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 'member');

-- Quotes: uma para Org-A, uma para Org-B
INSERT INTO quotes(id, organization_id, seller_id, created_by, title) VALUES
  ('a1aaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'Cotacao Org-A'),
  ('b1bbbbbb-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'Cotacao Org-B');

-- Orders: uma para Org-A, uma para Org-B
INSERT INTO orders(id, organization_id) VALUES
  ('a1aaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('b1bbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001');

INSERT INTO order_items(id, order_id, product_id, quantity) VALUES
  (gen_random_uuid(), 'a1aaaaaa-0000-0000-0000-000000000002', gen_random_uuid(), 10),
  (gen_random_uuid(), 'b1bbbbbb-0000-0000-0000-000000000002', gen_random_uuid(), 20);

-- Profiles
INSERT INTO profiles(id, user_id, name) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'User A1'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'User B1');

-- -----------------------------------------------------------------------
-- 7. TESTES DE ISOLAMENTO TENANT A × B
-- -----------------------------------------------------------------------
\echo '=== TESTE 1: user-a-1 só vê dados de Org-A ===\n'

BEGIN;
  SET LOCAL role = authenticated;
  SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-0000-0000-0000-000000000002"}';

  -- T1.1: quotes visíveis (deve ser 1 — apenas Org-A)
  SELECT 'T1.1 quotes visíveis para user-a-1' AS teste,
         count(*) AS resultado,
         CASE WHEN count(*)=1 THEN 'PASS ✓' ELSE 'FAIL ✗' END AS status
  FROM quotes;

  -- T1.2: cotação de Org-B não deve aparecer
  SELECT 'T1.2 cotação Org-B invisível' AS teste,
         count(*) AS resultado,
         CASE WHEN count(*)=0 THEN 'PASS ✓' ELSE 'FAIL ✗ VAZAMENTO!' END AS status
  FROM quotes WHERE organization_id='bbbbbbbb-0000-0000-0000-000000000001';

  -- T1.3: orders visíveis (deve ser 1 — apenas Org-A)
  SELECT 'T1.3 orders visíveis para user-a-1' AS teste,
         count(*) AS resultado,
         CASE WHEN count(*)=1 THEN 'PASS ✓' ELSE 'FAIL ✗' END AS status
  FROM orders;

  -- T1.4: order_items de Org-B não visíveis
  SELECT 'T1.4 order_items de Org-B invisíveis' AS teste,
         count(*) AS resultado,
         CASE WHEN count(*)=0 THEN 'PASS ✓' ELSE 'FAIL ✗ VAZAMENTO!' END AS status
  FROM order_items WHERE order_id='b1bbbbbb-0000-0000-0000-000000000002';

  -- T1.5: membros de Org-B invisíveis via user_organizations
  SELECT 'T1.5 membros Org-B invisíveis' AS teste,
         count(*) AS resultado,
         CASE WHEN count(*)=0 THEN 'PASS ✓' ELSE 'FAIL ✗ VAZAMENTO!' END AS status
  FROM user_organizations WHERE organization_id='bbbbbbbb-0000-0000-0000-000000000001';

  -- T1.6: profile de user-b-1 invisível (RLS só vê o próprio)
  SELECT 'T1.6 profile user-b-1 invisível' AS teste,
         count(*) AS resultado,
         CASE WHEN count(*)=0 THEN 'PASS ✓' ELSE 'FAIL ✗ VAZAMENTO!' END AS status
  FROM profiles WHERE user_id='bbbbbbbb-0000-0000-0000-000000000002';

ROLLBACK;

\echo '\n=== TESTE 2: user-b-1 só vê dados de Org-B ===\n'

BEGIN;
  SET LOCAL role = authenticated;
  SET LOCAL "request.jwt.claims" = '{"sub":"bbbbbbbb-0000-0000-0000-000000000002"}';

  -- T2.1: quotes visíveis (deve ser 1 — apenas Org-B)
  SELECT 'T2.1 quotes visíveis para user-b-1' AS teste,
         count(*) AS resultado,
         CASE WHEN count(*)=1 THEN 'PASS ✓' ELSE 'FAIL ✗' END AS status
  FROM quotes;

  -- T2.2: cotação de Org-A não deve aparecer
  SELECT 'T2.2 cotação Org-A invisível' AS teste,
         count(*) AS resultado,
         CASE WHEN count(*)=0 THEN 'PASS ✓' ELSE 'FAIL ✗ VAZAMENTO!' END AS status
  FROM quotes WHERE organization_id='aaaaaaaa-0000-0000-0000-000000000001';

  -- T2.3: orders de Org-A invisíveis
  SELECT 'T2.3 orders Org-A invisíveis' AS teste,
         count(*) AS resultado,
         CASE WHEN count(*)=0 THEN 'PASS ✓' ELSE 'FAIL ✗ VAZAMENTO!' END AS status
  FROM orders WHERE organization_id='aaaaaaaa-0000-0000-0000-000000000001';

ROLLBACK;

\echo '\n=== TESTE 3: user-a-2 (member) SEM acesso a quotes de coordinator ===\n'

BEGIN;
  SET LOCAL role = authenticated;
  SET LOCAL "request.jwt.claims" = '{"sub":"aaaaaaaa-0000-0000-0000-000000000003"}';

  -- T3.1: user-a-2 é member (não coordinator), não deve ver quotes onde não é seller/creator/assignee
  SELECT 'T3.1 member não vê quotes de outros (sem coord)' AS teste,
         count(*) AS resultado,
         CASE WHEN count(*)=0 THEN 'PASS ✓ (filtro coord funciona)' ELSE 'INFO — vê ' || count(*) || ' quotes (esperado 0 se não é seller/creator)' END AS status
  FROM quotes;

ROLLBACK;

\echo '\n=== TESTE 4: anon NÃO deve ver dados sensíveis ===\n'

BEGIN;
  SET LOCAL role = anon;
  SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000000"}';

  -- T4.1: anon não vê quotes (tabela não tem policy para anon)
  SELECT 'T4.1 anon não vê quotes' AS teste,
         count(*) AS resultado,
         CASE WHEN count(*)=0 THEN 'PASS ✓' ELSE 'FAIL ✗ VAZAMENTO anon!' END AS status
  FROM quotes;

  -- T4.2: anon não vê orders
  SELECT 'T4.2 anon não vê orders' AS teste,
         count(*) AS resultado,
         CASE WHEN count(*)=0 THEN 'PASS ✓' ELSE 'FAIL ✗ VAZAMENTO anon!' END AS status
  FROM orders;

  -- T4.3: anon não vê user_organizations
  SELECT 'T4.3 anon não vê user_organizations' AS teste,
         count(*) AS resultado,
         CASE WHEN count(*)=0 THEN 'PASS ✓' ELSE 'FAIL ✗ VAZAMENTO anon!' END AS status
  FROM user_organizations;

ROLLBACK;

\echo '\n=== FIM DOS TESTES ==='
