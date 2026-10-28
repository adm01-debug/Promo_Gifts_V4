-- Migration: 20261027195959_supplier_stricker_rls_deny_all.sql
-- CONTEXTO: Schema supplier_stricker tem 17 tabelas sem RLS e grants SELECT
-- a `authenticated` já existentes. Schema USAGE não concedido → hoje inacessível.
-- RISCO: se GRANT USAGE ON SCHEMA supplier_stricker TO authenticated for adicionado,
-- todas as 17 tabelas ficam expostas irrestritamente (sem RLS = deny-all silencioso
-- nunca garante deny-all, cada policy ausente = acesso livre para quem tem USAGE).
-- FIX: habilitar RLS em todas as 17 tabelas com policy deny-all explícita.
-- Ao expor uma tabela via API no futuro: substituir a policy por uma USING real.
-- Evidência: auditoria 2026-10-27 docs/db/SCHEMAS_EXTRA_AUDIT_2026-10-27.md
-- Rollback: DROP POLICY deny_all ON supplier_stricker.X + ALTER TABLE X DISABLE ROW LEVEL SECURITY

-- ── PRÉ-CONDIÇÕES ──────────────────────────────────────────────────────────────

DO $$
DECLARE
  missing text[];
BEGIN
  SELECT ARRAY_AGG(t) INTO missing
  FROM UNNEST(ARRAY[
    'canceled_products','category_mappings','colors','stg_colors',
    'customization_options','customization_tables','stg_customizations','stg_images',
    'optionals','stg_product_types','product_types','products',
    'stg_optionals','stg_products','stg_stock','stocks','sync_log'
  ]) t
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'supplier_stricker' AND c.relname = t AND c.relkind = 'r'
  );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Pré-condição falhou: tabelas não encontradas em supplier_stricker: %',
      array_to_string(missing, ', ');
  END IF;
END;
$$;

-- ── ENABLE RLS + POLICY DENY-ALL ──────────────────────────────────────────────

ALTER TABLE supplier_stricker.canceled_products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.category_mappings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.colors                ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.stg_colors              ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.customization_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.customization_tables  ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.stg_customizations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.stg_images              ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.optionals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.stg_product_types       ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.product_types         ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.stg_optionals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.stg_products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.stg_stock             ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.stocks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_stricker.sync_log              ENABLE ROW LEVEL SECURITY;

CREATE POLICY deny_all ON supplier_stricker.canceled_products     USING (false);
CREATE POLICY deny_all ON supplier_stricker.category_mappings     USING (false);
CREATE POLICY deny_all ON supplier_stricker.colors                USING (false);
CREATE POLICY deny_all ON supplier_stricker.stg_colors              USING (false);
CREATE POLICY deny_all ON supplier_stricker.customization_options USING (false);
CREATE POLICY deny_all ON supplier_stricker.customization_tables  USING (false);
CREATE POLICY deny_all ON supplier_stricker.stg_customizations     USING (false);
CREATE POLICY deny_all ON supplier_stricker.stg_images              USING (false);
CREATE POLICY deny_all ON supplier_stricker.optionals             USING (false);
CREATE POLICY deny_all ON supplier_stricker.stg_product_types       USING (false);
CREATE POLICY deny_all ON supplier_stricker.product_types         USING (false);
CREATE POLICY deny_all ON supplier_stricker.products              USING (false);
CREATE POLICY deny_all ON supplier_stricker.stg_optionals         USING (false);
CREATE POLICY deny_all ON supplier_stricker.stg_products          USING (false);
CREATE POLICY deny_all ON supplier_stricker.stg_stock             USING (false);
CREATE POLICY deny_all ON supplier_stricker.stocks                USING (false);
CREATE POLICY deny_all ON supplier_stricker.sync_log              USING (false);

-- ── PÓS-CONDIÇÕES ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  not_rls text[];
  no_policy text[];
BEGIN
  -- Verifica RLS habilitado
  SELECT ARRAY_AGG(relname) INTO not_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'supplier_stricker'
    AND c.relkind = 'r'
    AND c.relname = ANY(ARRAY[
      'canceled_products','category_mappings','colors','stg_colors',
      'customization_options','customization_tables','stg_customizations','stg_images',
      'optionals','stg_product_types','product_types','products',
      'stg_optionals','stg_products','stg_stock','stocks','sync_log'
    ])
    AND NOT c.relrowsecurity;

  IF not_rls IS NOT NULL THEN
    RAISE EXCEPTION 'Pós-condição falhou: RLS não habilitado em: %',
      array_to_string(not_rls, ', ');
  END IF;

  -- Verifica policy deny_all criada
  SELECT ARRAY_AGG(DISTINCT c.relname) INTO no_policy
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'supplier_stricker'
    AND c.relkind = 'r'
    AND c.relname = ANY(ARRAY[
      'canceled_products','category_mappings','colors','stg_colors',
      'customization_options','customization_tables','stg_customizations','stg_images',
      'optionals','stg_product_types','product_types','products',
      'stg_optionals','stg_products','stg_stock','stocks','sync_log'
    ])
    AND NOT EXISTS (
      SELECT 1 FROM pg_policy p
      WHERE p.polrelid = c.oid AND p.polname = 'deny_all'
    );

  IF no_policy IS NOT NULL THEN
    RAISE EXCEPTION 'Pós-condição falhou: policy deny_all ausente em: %',
      array_to_string(no_policy, ', ');
  END IF;
END;
$$;
